import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const subscribeSchema = z.object({
  tierId: z.string().min(1),
});

// POST /api/checkout/subscribe – create a Stripe Checkout session for a recurring subscription
export async function POST(req: NextRequest) {
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

  // Validate tier exists and is active, include shelter name
  const tier = await prisma.donationTier.findUnique({
    where:   { id: tierId },
    include: { shelter: { select: { id: true, name: true } } },
  });
  if (!tier) {
    return NextResponse.json({ error: "A csomag nem található" }, { status: 404 });
  }
  if (!tier.isActive) {
    return NextResponse.json({ error: "A csomag nem aktív" }, { status: 409 });
  }

  // Create Stripe Checkout Session for subscription
  // HUF is a zero-decimal currency → pass amount as-is
  const checkoutSession = await getStripe().checkout.sessions.create({
    mode:     "subscription",
    currency: "huf",
    line_items: [
      {
        price_data: {
          currency:     "huf",
          product_data: { name: `${tier.shelter.name} – ${tier.name}` },
          unit_amount:  tier.amount, // HUF, zero-decimal
          recurring:    { interval: "month" },
        },
        quantity: 1,
      },
    ],
    success_url: `${BASE}/shelters/${tier.shelter.id}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE}/shelters/${tier.shelter.id}`,
    metadata: {
      tierId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
