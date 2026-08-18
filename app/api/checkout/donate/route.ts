import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, resolveTransferDestination, platformFee, stripeProcessingFee, PLATFORM_FEE_PERCENT, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE_HUF, MIN_DONATION_HUF, toStatementSuffix } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { blockIfSuspended } from "@/lib/account-status";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const donateSchema = z.object({
  campaignId:  z.string().min(1),
  // Az űrlap is ezt mutatja, de a határt itt kell kikényszeríteni: az API-ra
  // közvetlenül is lehet küldeni, és 1 Ft-os adományoknál a fix díj miatt a
  // támogatóra terhelt összeg abszurd lenne.
  amount:      z.number().int().min(MIN_DONATION_HUF).max(5_000_000),
  message:     z.string().max(500).optional().nullable(),
  isAnonymous: z.boolean().optional().default(false),
});

// POST /api/checkout/donate – create a Stripe Checkout session for a one-time donation
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`donate:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Túl sok kísérlet. Próbáld újra 1 perc múlva." }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const suspended = await blockIfSuspended(session.user.id);
    if (suspended) return suspended;
  }

  const parsed = donateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { campaignId, amount, message, isAnonymous } = parsed.data;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      shelter: { select: { stripeAccountId: true, stripeOnboardingComplete: true } },
      user:    { select: { stripeAccountId: true, stripeOnboardingComplete: true } },
    },
  });
  if (!campaign) {
    return NextResponse.json({ error: "A kampány nem található" }, { status: 404 });
  }
  if (campaign.status !== "ACTIVE") {
    return NextResponse.json({ error: "A kampány nem fogad adományokat" }, { status: 409 });
  }

  // Determine connected Stripe account for automatic transfer.
  // Verify it actually exists in Stripe – otherwise fall back to the platform
  // account so a stale/invalid acct_… id doesn't break checkout.
  const candidateAccountId =
    (campaign.shelter?.stripeOnboardingComplete && campaign.shelter?.stripeAccountId)
      ? campaign.shelter.stripeAccountId
      : (campaign.user?.stripeOnboardingComplete && campaign.user?.stripeAccountId)
      ? campaign.user.stripeAccountId
      : null;

  if (!candidateAccountId) {
    return NextResponse.json(
      { error: "Ez a kampány jelenleg nem fogadhat adományokat. A menhely Stripe fiókja nincs beállítva." },
      { status: 402 }
    );
  }

  const connectedAccountId = await resolveTransferDestination(candidateAccountId);

  if (!connectedAccountId) {
    return NextResponse.json(
      { error: "A menhely Stripe fiókja még nem aktív. Kérjük próbálj újra később." },
      { status: 402 }
    );
  }

  // Stripe uses fillér (1 HUF = 100 fillér) as the smallest unit.
  // When routing to a connected account three fees are added ON TOP:
  //   • platform fee (5%) – kept by the platform  → application_fee_amount
  //   • Stripe processing fee (1.4% + 25 HUF)     → passed through to Stripe
  // The shelter receives the full `amount`; the donor pays amount + both fees.
  const amountInFiller    = amount * 100;
  const feeForint         = connectedAccountId ? platformFee(amount) : 0;
  const feeInFiller       = feeForint * 100;
  const stripeFeeFt       = connectedAccountId ? stripeProcessingFee(amount) : 0;
  const stripeFeeInFiller = stripeFeeFt * 100;

  // Create pending Donation record (paidAt set by webhook after payment).
  // `amount` is the donor's intended donation that goes to the shelter.
  const donation = await prisma.donation.create({
    data: {
      userId:      session?.user?.id ?? null,
      campaignId,
      amount,
      message:     message ?? null,
      isAnonymous: isAnonymous ?? false,
      paidAt:      null,
    },
  });

  let checkoutSession;
  try {
    checkoutSession = await getStripe().checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"],
      // Pass donor's email so Stripe sends an automatic receipt and links
      // the payment to a customer record for invoice history
      customer_email: session?.user?.email ?? undefined,
      // Generate a downloadable invoice for every one-time payment
      invoice_creation: { enabled: true },
      line_items: [
        {
          price_data: {
            currency:     "huf",
            product_data: { name: campaign.title },
            unit_amount:  amountInFiller,
          },
          quantity: 1,
        },
        // Platform fee shown as a transparent line item
        ...(feeInFiller > 0
          ? [{
              price_data: {
                currency:     "huf",
                product_data: { name: `Platform díj (${PLATFORM_FEE_PERCENT}%)` },
                unit_amount:  feeInFiller,
              },
              quantity: 1,
            }]
          : []),
        // Stripe processing fee passed through to the payer
        ...(stripeFeeInFiller > 0
          ? [{
              price_data: {
                currency:     "huf",
                product_data: { name: `Feldolgozási díj (${STRIPE_PERCENT_FEE}% + ${STRIPE_FIXED_FEE_HUF} Ft)` },
                unit_amount:  stripeFeeInFiller,
              },
              quantity: 1,
            }]
          : []),
      ],
      success_url: `${BASE}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE}/donate/${campaign.id}`,
      metadata:    { donationId: donation.id },
      ...(connectedAccountId && {
        payment_intent_data: {
          // A bankkivonaton felismerhető legyen, kire költött a támogató.
          statement_descriptor_suffix: toStatementSuffix(campaign.title),
          description: `Adomány – ${campaign.title}`,
          // application_fee_amount must cover both platform fee AND the Stripe
          // processing fee we collected from the donor, so that the shelter
          // receives exactly `amount` and not amount + stripe_fee_line_item.
          application_fee_amount: feeInFiller + stripeFeeInFiller,
          transfer_data: { destination: connectedAccountId },
        },
      }),
    });
  } catch (err) {
    console.error("Stripe checkout/donate error:", err);
    const msg = err instanceof Error ? err.message : "Stripe hiba";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await prisma.donation.update({
    where: { id: donation.id },
    data:  { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
