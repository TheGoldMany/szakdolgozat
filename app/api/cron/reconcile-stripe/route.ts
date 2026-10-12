import { NextRequest, NextResponse } from "next/server";
import { reconcileStripeEvents, MAX_LOOKBACK_DAYS } from "@/lib/stripe-reconcile";

export const dynamic = "force-dynamic";
// Az egyeztetés több tucat Stripe-hívást és adatbázis-írást végezhet.
export const maxDuration = 60;

/**
 * Napi egyeztetés a Stripe eseménylistájával.
 *
 * Azt pótolja, ami a webhookon kimaradt: a havi megújítások, a visszatérítések
 * és a viták könyvelésének NINCS más útja, a Stripe pedig három nap után feladja
 * az újrapróbálást. Enélkül egy ennél hosszabb kiesés véglegesen elveszett
 * könyvelés — valódi pénzről. A részleteket lásd `lib/stripe-reconcile.ts`.
 *
 * KORLÁT: a platform eseménylistáját nézi. Destination charge modellben a
 * terhelés, a visszatérítés és a vita is a platform fiókján jön létre, tehát a
 * pénzügyileg kritikus események mind itt vannak. A csatolt fiókok SAJÁT
 * eseményei nem — azokat a Connect webhook endpoint hozza
 * (`STRIPE_CONNECT_WEBHOOK_SECRET`).
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Alapból egy hét: bőven átfogja a Stripe háromnapos újrapróbálási ablakát,
  // és egy hétvégi kiesés is belefér. Hosszabb kiesés után kézzel is hívható
  // nagyobb értékkel (`?days=30`), ennyit tart meg a Stripe.
  const requested = Number.parseInt(req.nextUrl.searchParams.get("days") ?? "", 10);
  const lookbackDays = Number.isFinite(requested) ? requested : 7;

  try {
    // Hagyunk 10 másodpercet a válaszra és a lezárásra: ha a kiszolgáló
    // félúton vágja el a futást, az elvégzett munka `markProcessed` nélkül
    // marad, és a következő futás ugyanonnan kezdené.
    const result = await reconcileStripeEvents({
      lookbackDays,
      deadlineMs: Date.now() + 50_000,
    });

    const failureCount = Object.keys(result.failures).length;

    // Ha pótolni KELLETT, az önmagában hír: a webhook nem végzi a munkáját.
    // Ezt naplózzuk, hogy ne csak az összesítőben lássuk.
    if (result.recovered > 0 || failureCount > 0) {
      console.error(
        `[cron/reconcile-stripe] ${result.recovered} kimaradt esemény pótolva, ` +
        `${failureCount} hibás. A webhook nem dolgozza fel az eseményeket – ` +
        `ellenőrizd a Stripe → Developers → Webhooks oldalt.`,
        JSON.stringify(result.failures)
      );
    }

    return NextResponse.json({ ok: true, maxLookbackDays: MAX_LOOKBACK_DAYS, ...result });
  } catch (err) {
    console.error("[cron/reconcile-stripe] error:", err);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
