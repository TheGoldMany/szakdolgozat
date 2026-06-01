import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, resolveTransferDestination, platformFee, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const donateSchema = z.object({
  campaignId:  z.string().min(1),
  amount:      z.number().int().positive(),
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
  const connectedAccountId = await resolveTransferDestination(candidateAccountId);

  // Stripe uses fillér (1 HUF = 100 fillér) as the smallest unit.
  // When routing to a connected account, the 4% platform fee is added ON TOP
  // of the donor's intended amount: the donor pays amount + fee, the shelter
  // receives the full `amount`, and the platform keeps `fee`.
  const amountInFiller = amount * 100;
  const feeForint      = connectedAccountId ? platformFee(amount) : 0;
  const feeInFiller    = feeForint * 100;

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
      line_items: [
        {
          price_data: {
            currency:     "huf",
            product_data: { name: campaign.title },
            unit_amount:  amountInFiller,
          },
          quantity: 1,
        },
        // Show the platform fee as a separate, transparent line item
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
      ],
      success_url: `${BASE}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE}/donate/${campaign.id}`,
      metadata:    { donationId: donation.id },
      ...(connectedAccountId && {
        payment_intent_data: {
          application_fee_amount: feeInFiller,
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
