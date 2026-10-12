import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, explainFailure } from "@/lib/stripe-webhook";
import { handleStripeEvent } from "@/lib/stripe-events";
import { alreadyProcessed, markProcessed } from "@/lib/webhook-events";

// Disable body parsing — we need the raw body for signature verification
export const dynamic = "force-dynamic";

// POST /api/webhooks/stripe – handle Stripe webhook events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  // Az ellenőrzés az ÖSSZES beállított titokkal próbálkozik (platform +
  // Connect + rotáció), és bukáskor megmondja, miért. Lásd `lib/stripe-webhook.ts`.
  const verified = verifyWebhook(body, sig);

  if (!verified.ok) {
    const { diagnosis } = verified;
    console.error("Stripe webhook signature verification failed:", JSON.stringify(diagnosis));

    // A diagnózis a VÁLASZBA is belekerül, mert a Stripe Dashboard az endpoint
    // alatt megőrzi a válaszunkat, a futásnaplót viszont a hosting csomag egy
    // óra után eldobja. Titkot nem tartalmaz – a részleteket lásd a helpernél.
    const status = diagnosis.reason === "no_secret_configured" ? 500 : 400;
    return NextResponse.json(
      { error: "Webhook Error", ...diagnosis, hint: explainFailure(diagnosis) },
      { status }
    );
  }

  const event = verified.event;

  // Csatolt fiók eseménye (külön Connect endpointról). Az ágak mind a PLATFORM
  // oldali azonosítók szerint keresnek (`stripeSubId`, `payment_intent`), ezért
  // egy csatolt fiók saját azonosítója nem talál sort – nem téved, csak nem tesz
  // semmit. A naplósor azért kell, hogy lássuk: ezek egyáltalán megérkeznek-e.
  if (event.account) {
    console.log(`[stripe webhook] connected-account event ${event.type} (${event.account})`);
  }

  // Ezt az eseményt már végigvittük – nincs mit tenni.
  if (await alreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, deduplicated: true });
  }

  // Az ágak a `lib/stripe-events.ts`-ben élnek, mert az egyeztető cron is
  // ugyanazt a kódot futtatja a Stripe eseménylistájából visszamenőleg.
  const failed = await handleStripeEvent(event);

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
