import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, resolveTransferDestination, platformFee, stripeProcessingFee, PLATFORM_FEE_PERCENT, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE_HUF, subscriptionFeePercent } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { blockIfSuspended } from "@/lib/account-status";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const subscribeSchema = z.object({
  tierId: z.string().min(1),
});

// POST /api/checkout/subscribe – create a Stripe Checkout session for a recurring subscription
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`subscribe:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Túl sok kísérlet. Próbáld újra 1 perc múlva." }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  const suspended = await blockIfSuspended(session.user.id);
  if (suspended) return suspended;

  const parsed = subscribeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tierId } = parsed.data;

  // Validate tier exists and is active, include shelter name and Stripe info
  const tier = await prisma.donationTier.findUnique({
    where:   { id: tierId },
    include: { shelter: { select: { id: true, name: true, slug: true, stripeAccountId: true, stripeOnboardingComplete: true } } },
  });
  if (!tier) {
    return NextResponse.json({ error: "A csomag nem található" }, { status: 404 });
  }
  if (!tier.isActive) {
    return NextResponse.json({ error: "A csomag nem aktív" }, { status: 409 });
  }

  // Prevent duplicate active subscriptions to the same tier
  const existing = await prisma.subscription.findFirst({
    where: { userId: session.user.id, tierId, status: "ACTIVE" },
  });
  if (existing) {
    return NextResponse.json({ error: "Már van aktív feliratkozásod erre a csomagra." }, { status: 409 });
  }

  // Determine connected Stripe account for automatic transfer.
  // Verify it actually exists in Stripe – otherwise fall back to the platform
  // account so a stale/invalid acct_… id doesn't break checkout.
  const connectedAccountId = await resolveTransferDestination(
    tier.shelter.stripeOnboardingComplete ? tier.shelter.stripeAccountId : null
  );

  // Three amounts added ON TOP of the tier price each month:
  //   • platform fee (5%)              → application_fee_percent
  //   • Stripe processing fee estimate → shown as transparent line item
  // application_fee_percent is based on (amount + platformFee) so the shelter
  // nets the tier amount after Stripe takes its processing cut.
  const feeForint    = connectedAccountId ? platformFee(tier.amount) : 0;
  const stripeFeeFt  = connectedAccountId ? stripeProcessingFee(tier.amount) : 0;
  // application_fee_percent must cover both the platform fee AND the Stripe
  // processing fee we collected, so the shelter nets exactly tier.amount.
  // It is applied to the total (tier + platform fee + stripe fee), so:
  //   total × feePercent = platformFee + stripeFee
  const feePercent   = connectedAccountId ? subscriptionFeePercent(tier.amount) : 0;

  let checkoutSession;
  try {
    checkoutSession = await getStripe().checkout.sessions.create({
      mode:                 "subscription",
      payment_method_types: ["card"],
      // Pass subscriber's email so Stripe auto-sends invoice emails
      // and creates a customer record for billing history
      customer_email: session.user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency:     "huf",
            product_data: { name: `${tier.shelter.name} – ${tier.name}` },
            unit_amount:  tier.amount * 100, // Convert HUF to fillér (Stripe smallest unit)
            recurring:    { interval: "month" },
          },
          quantity: 1,
        },
        // Platform fee – transparent recurring line item
        ...(feeForint > 0
          ? [{
              price_data: {
                currency:     "huf",
                product_data: { name: `Platform díj (${PLATFORM_FEE_PERCENT}%)` },
                unit_amount:  feeForint * 100,
                recurring:    { interval: "month" as const },
              },
              quantity: 1,
            }]
          : []),
        // Stripe processing fee passed through to the subscriber
        ...(stripeFeeFt > 0
          ? [{
              price_data: {
                currency:     "huf",
                product_data: { name: `Feldolgozási díj (${STRIPE_PERCENT_FEE}% + ${STRIPE_FIXED_FEE_HUF} Ft)` },
                unit_amount:  stripeFeeFt * 100,
                recurring:    { interval: "month" as const },
              },
              quantity: 1,
            }]
          : []),
      ],
      success_url: `${BASE}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE}/shelters/${tier.shelter.slug}`,
      metadata: {
        tierId,
        userId: session.user.id,
      },
      ...(connectedAccountId && {
        subscription_data: {
          application_fee_percent: feePercent,
          transfer_data: { destination: connectedAccountId },
        },
      }),
    });
  } catch (err) {
    console.error("Stripe checkout/subscribe error:", err);
    const msg = err instanceof Error ? err.message : "Stripe hiba";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
