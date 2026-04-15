import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Disable body parsing — we need the raw body for signature verification
export const dynamic = "force-dynamic";

// POST /api/webhooks/stripe – handle Stripe webhook events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const metadata = checkoutSession.metadata ?? {};

    // ----------------------------------------------------------------
    // Case 1: One-time donation
    // ----------------------------------------------------------------
    if (metadata.donationId) {
      const donationId = metadata.donationId;

      // Mark donation as paid
      const donation = await prisma.donation.update({
        where: { id: donationId },
        data:  { paidAt: new Date() },
      });

      // Increment campaign raisedAmount if linked
      if (donation.campaignId) {
        await prisma.campaign.update({
          where: { id: donation.campaignId },
          data:  { raisedAmount: { increment: donation.amount } },
        });
      }
    }

    // ----------------------------------------------------------------
    // Case 2: Subscription checkout completed
    // ----------------------------------------------------------------
    if (metadata.tierId && metadata.userId) {
      const { tierId, userId } = metadata;
      const stripeSubId = checkoutSession.subscription
        ? String(checkoutSession.subscription)
        : undefined;

      // Create Subscription record (avoid duplicates via stripeSubId unique constraint)
      await prisma.subscription.upsert({
        where:  { stripeSubId: stripeSubId ?? "" },
        update: {}, // already exists — no-op
        create: {
          userId,
          tierId,
          status:     "ACTIVE",
          stripeSubId: stripeSubId ?? null,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
