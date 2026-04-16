import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

  // Determine connected Stripe account for automatic transfer
  const connectedAccountId =
    (tier.shelter.stripeOnboardingComplete && tier.shelter.stripeAccountId)
      ? tier.shelter.stripeAccountId
      : null;

  // Create Stripe Checkout Session for subscription
  // HUF is a zero-decimal currency → pass amount as-is
  let checkoutSession;
  try {
    checkoutSession = await getStripe().checkout.sessions.create({
      mode:                 "subscription",
      payment_method_types: ["card"],
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
      ],
      success_url: `${BASE}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE}/shelters/${tier.shelter.slug}`,
      metadata: {
        tierId,
        userId: session.user.id,
      },
      ...(connectedAccountId && {
        subscription_data: {
          application_fee_percent: 1,
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
