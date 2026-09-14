import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendPaymentFailedEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { fulfillDonation, notifyDonation } from "@/lib/donations";
import { invoiceSubscriptionId, recordSubscriptionPayment } from "@/lib/subscription-payments";
import { applyRefund, recordDispute } from "@/lib/refunds";
import { alreadyProcessed, markProcessed } from "@/lib/webhook-events";
import {
  activateSubscription, notifySubscriptionStarted,
  activateSponsorship,  notifySponsorshipStarted,
} from "@/lib/subscription-activation";

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
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Ezt az eseményt már végigvittük – nincs mit tenni.
  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  /**
   * Minden ág külön hibakezelést kap.
   *
   * Korábban egyetlen törzsben futott az összes ág: ha a hatodik dobott, a
   * route 500-at adott, a Stripe újraküldte az eseményt, és az első öt ág ÚJRA
   * lefutott. Így viszont egy ág hibája nem rántja magával a többit — a hibás
   * ág újrapróbálását pedig a végén adott nem-2xx válasz kéri a Stripe-tól,
   * amit a már sikeres ágak idempotenciája tesz ártalmatlanná.
   */
  const failed: string[] = [];
  const branch = async (name: string, fn: () => Promise<void>): Promise<void> => {
    try {
      await fn();
    } catch (err) {
      console.error(`Stripe webhook [${name}] error:`, err);
      failed.push(name);
    }
  };

  // Subscription cancelled/deleted via Stripe Dashboard or API
  if (event.type === "customer.subscription.deleted") {
    await branch("subscription.deleted", async () => {
      const stripeSub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubId: stripeSub.id },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      });
      await prisma.sponsorship.updateMany({
        where: { stripeSubId: stripeSub.id },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      });
    });
  }

  // Subscription status changed (e.g. active → past_due → canceled) — keep DB in sync
  if (event.type === "customer.subscription.updated") {
    await branch("subscription.updated", async () => {
      const stripeSub = event.data.object as Stripe.Subscription;
      const status: "ACTIVE" | "PAST_DUE" | "CANCELLED" =
        stripeSub.status === "active" || stripeSub.status === "trialing"
          ? "ACTIVE"
          : stripeSub.status === "past_due" || stripeSub.status === "unpaid"
          ? "PAST_DUE"
          : stripeSub.status === "canceled"
          ? "CANCELLED"
          : "ACTIVE";

      await prisma.subscription.updateMany({
        where: { stripeSubId: stripeSub.id },
        data:  status === "CANCELLED"
          ? { status, cancelledAt: new Date() }
          : { status },
      });
      await prisma.sponsorship.updateMany({
        where: { stripeSubId: stripeSub.id },
        data:  status === "CANCELLED"
          ? { status, cancelledAt: new Date() }
          : { status },
      });
    });
  }

  // Recurring payment failed — mark PAST_DUE and notify the subscriber
  if (event.type === "invoice.payment_failed") {
    await branch("invoice.payment_failed", async () => {
      const invoice = event.data.object as Stripe.Invoice;
      // A használt API-verzióban a számlán nincs lapos `subscription` mező –
      // korábban ezért mindig null volt, és ez az ág sosem futott le.
      const stripeSubId = invoiceSubscriptionId(invoice);
      if (!stripeSubId) return;

      const sub = await prisma.subscription.findUnique({
        where:   { stripeSubId },
        include: {
          user: { select: { id: true, email: true, name: true } },
          tier: { include: { shelter: { select: { name: true } } } },
        },
      });

      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data:  { status: "PAST_DUE" },
        });

        if (sub.user) {
          const amountStr = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(sub.tier.amount);
          createNotification({
            userId: sub.user.id,
            type:   "SUBSCRIPTION_PAYMENT_FAILED",
            title:  "Sikertelen havi fizetés",
            body:   `${sub.tier.name} – ${amountStr}/hó (${sub.tier.shelter.name}). Kérjük ellenőrizd a kártyádat.`,
            href:   "/profile",
          }).catch((err) => console.error("Payment-failed notification error:", err));

          if (sub.user.email) {
            sendPaymentFailedEmail({
              to:          sub.user.email,
              name:        sub.user.name ?? "Felhasználó",
              shelterName: sub.tier.shelter.name,
              tierName:    sub.tier.name,
              amount:      sub.tier.amount,
            }).catch((err) => console.error("Payment-failed email error:", err));
          }
        }
      }
    });
  }

  // Sikeres havi terhelés (megújítás). A Stripe csak az ELSŐ fizetésről küld
  // checkout.session.completed-et; enélkül a második hónaptól kezdve semmi
  // nyoma nem maradt a befolyt pénznek.
  if (event.type === "invoice.payment_succeeded") {
    await branch("invoice.payment_succeeded", async () => {
      const invoice = event.data.object as Stripe.Invoice;
      await recordSubscriptionPayment(invoice);

      // Egy korábban sikertelen terhelés után a Stripe újrapróbálkozik; ha most
      // átment, az előfizetés visszakerül aktívba.
      const stripeSubId = invoiceSubscriptionId(invoice);
      if (stripeSubId) {
        await prisma.subscription.updateMany({
          where: { stripeSubId, status: "PAST_DUE" },
          data:  { status: "ACTIVE" },
        });
        await prisma.sponsorship.updateMany({
          where: { stripeSubId, status: "PAST_DUE" },
          data:  { status: "ACTIVE" },
        });
      }
    });
  }

  // Visszatérítés. A `charge.refunded` a TELJES visszatérített összeget adja
  // meg, nem a mostani részletet – a helper ezért beállítja, nem növeli.
  if (event.type === "charge.refunded") {
    await branch("charge.refunded", async () => {
      await applyRefund(event.data.object as Stripe.Charge);
    });
  }

  // Vitatott tétel (chargeback). Destination charge-nál a visszaterhelt összeg
  // és a Stripe vitadíja is a PLATFORM egyenlegéről megy, ezért a super
  // adminnak azonnal tudnia kell róla.
  if (event.type === "charge.dispute.created" || event.type === "charge.dispute.updated") {
    await branch("charge.dispute", async () => {
      await recordDispute(event.data.object as Stripe.Dispute);
    });
  }

  // Elhagyott fizetés: a checkout indításakor létrehozott, soha ki nem fizetett
  // adomány-sort takarítjuk, hogy ne gyűljenek a szellemsorok.
  if (event.type === "checkout.session.expired") {
    await branch("checkout.session.expired", async () => {
      const expired = event.data.object as Stripe.Checkout.Session;
      const donationId = expired.metadata?.donationId;
      if (donationId) {
        await prisma.donation.deleteMany({ where: { id: donationId, paidAt: null } });
      }
    });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const metadata = checkoutSession.metadata ?? {};
    const stripeSubId = checkoutSession.subscription
      ? String(checkoutSession.subscription)
      : null;

    // ----------------------------------------------------------------
    // Case 1: One-time donation
    // ----------------------------------------------------------------
    if (metadata.donationId) {
      await branch("checkout.donation", async () => {
        // Fizetettre állítás + a gyűjtés összegének növelése, pontosan egyszer.
        // A Stripe újraküldheti ezt az eseményt; ilyenkor firstFulfilment=false,
        // és nem duplázzuk sem az összeget, sem az értesítéseket.
        const paymentIntentId = typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id ?? null;
        const { donation, firstFulfilment } = await fulfillDonation(metadata.donationId!, paymentIntentId);
        if (donation && firstFulfilment) {
          await notifyDonation(donation);
        }
      });
    }

    // ----------------------------------------------------------------
    // Case 2: Subscription checkout completed
    // ----------------------------------------------------------------
    if (metadata.tierId && metadata.userId) {
      await branch("checkout.subscription", async () => {
        // Előfizetés-azonosító nélkül nem tudnánk a sort a Stripe-hoz kötni: a
        // megújítások, a lemondás és a visszatérítés is ezen keresztül talál rá.
        // Korábban itt egy üres string állt a `where`-ben, ami sosem talált
        // sort, és minden újraküldésre új, `stripeSubId: null` értékű árva sort
        // hozott létre – Postgresen a unique index több NULL-t is megenged.
        if (!stripeSubId) {
          throw new Error(`checkout.session.completed without subscription id (session ${checkoutSession.id})`);
        }

        const { created } = await activateSubscription({
          stripeSubId,
          userId: metadata.userId!,
          tierId: metadata.tierId!,
        });
        // Értesítés csak az első alkalommal – a Stripe újraküldésére a támogató
        // nem kaphatja meg kétszer ugyanazt a visszaigazolást.
        if (created) {
          await notifySubscriptionStarted(metadata.userId!, metadata.tierId!);
        }
      });
    }

    // ----------------------------------------------------------------
    // Case 3: Virtual adoption (sponsorship) checkout completed
    // ----------------------------------------------------------------
    if (metadata.sponsorAnimalId && metadata.userId) {
      await branch("checkout.sponsorship", async () => {
        if (!stripeSubId) {
          throw new Error(`sponsorship checkout without subscription id (session ${checkoutSession.id})`);
        }

        const amount = parseInt(metadata.sponsorAmount ?? "0", 10) || 0;

        const { created } = await activateSponsorship({
          stripeSubId,
          userId:      metadata.userId!,
          animalId:    metadata.sponsorAnimalId!,
          amount,
          isPublic:    metadata.sponsorPublic !== "0",
          displayName: metadata.sponsorName || null,
        });
        if (created) {
          await notifySponsorshipStarted(metadata.userId!, metadata.sponsorAnimalId!, amount);
        }
      });
    }
  }

  // Nem-2xx válasz → a Stripe újraküldi az eseményt. Ilyenkor SZÁNDÉKOSAN nem
  // jelöljük feldolgozottnak: a sikeres ágak idempotensek, tehát az újrafutásuk
  // ártalmatlan, a hibás ág viszont kap még egy esélyt.
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Webhook processing failed", branches: failed },
      { status: 500 }
    );
  }

  await markProcessed(event.id, event.type);
  return NextResponse.json({ received: true });
}
