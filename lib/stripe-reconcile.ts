import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-events";
import { alreadyProcessed, markProcessed } from "@/lib/webhook-events";

/**
 * Utólagos egyeztetés a Stripe eseménylistájából.
 *
 * MIÉRT KELL
 *
 * Az egyszeri adományt és az előfizetés-aktiválást a siker-oldal pótolja, ha a
 * webhook elmarad. A HAVI MEGÚJÍTÁSNAK, A VISSZATÉRÍTÉSNEK ÉS A VITÁNAK
 * viszont semmilyen más útja nincs — azok kizárólag a webhookon jönnek. A
 * Stripe körülbelül három napig próbálkozik, majd feladja (és sok hiba után le
 * is tiltja az endpointot, ami utána MINDENT elvisz). Egy ennél hosszabb
 * kiesés így véglegesen elveszett könyvelés, valódi pénzről: a menhely nem
 * látja a bevételét, a visszatérített adomány bennmarad a gyűjtés összegében,
 * a vitáról pedig senki nem értesül, miközben a bizonyításnak határideje van.
 *
 * A Stripe az eseményeket **30 napig** megtartja és listázhatóvá teszi. Ez a
 * modul ezt használja: ami kimaradt, azt visszamenőleg lekérjük és ugyanazzal a
 * kóddal dolgozzuk fel, mint a webhook (`handleStripeEvent`). Nem új logika,
 * hanem új ÚTVONAL a meglévőhöz — ezért nem tud szétcsúszni a kettő.
 *
 * MIÉRT BIZTONSÁGOS KÉTSZER LEFUTTATNI
 *
 * Minden ág idempotens (`fulfillDonation` feltételes `updateMany`-je,
 * `recordSubscriptionPayment` egyedi `stripeInvoiceId`-ja, `applyRefund`
 * beállít-nem-növel szabálya, `recordDispute` upsertje). Fölöttük a
 * `ProcessedWebhookEvent` tábla a gyors kilépés. A rosszabb eset tehát nem a
 * duplázás, hanem a hiábavaló munka.
 */

/**
 * Azok az eseménytípusok, amelyeket a `handleStripeEvent` kezel.
 *
 * Szándékosan szűrjük a Stripe-nál, nem nálunk: az `events.list` különben
 * mindent visszaadna (a `charge.succeeded`-et, a `payment_intent.*` egész
 * életciklusát), és a napi néhány érdemi esemény elúszna több száz érdektelen
 * között, miközben a futási időnk véges.
 *
 * Ha ide új típus kerül, a `handleStripeEvent`-be is kell ág — és a Stripe
 * Dashboardon is be kell kapcsolni (lásd `docs/07-donations.md`).
 */
export const RECONCILED_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.expired",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
] as const;

/** A Stripe ennél régebbi eseményt nem ad vissza, tehát ennél tovább nincs értelme nézni. */
export const MAX_LOOKBACK_DAYS = 30;

export interface ReconcileResult {
  /** Hány eseményt kaptunk a Stripe-tól a vizsgált időszakban. */
  scanned: number;
  /** Ennyi már fel volt dolgozva – ez a normális állapot. */
  alreadyDone: number;
  /** Ennyi MARADT KI, és most pótoltuk. Ha ez tartósan nem nulla, a webhook rossz. */
  recovered: number;
  /** Eseményazonosító → a hibára futott ágak. Ezek a következő futáskor újra sorra kerülnek. */
  failures: Record<string, string[]>;
  /** Igaz, ha az időkorlát miatt nem jutottunk a lista végére. */
  truncated: boolean;
  lookbackDays: number;
}

/**
 * A kimaradt események pótlása.
 *
 * @param lookbackDays hány napra visszamenőleg nézzünk (felső korlát 30).
 * @param deadlineMs   meddig futhatunk (epoch ms). A kiszolgáló kivégzi a
 *                     függvényt a saját határánál, ezért MAGUNK állunk le
 *                     előbb: egy félúton megszakított futás nem tudná
 *                     `markProcessed`-elni azt, amit épp elvégzett, és a
 *                     következő futás ugyanonnan kezdené — örökké.
 */
export async function reconcileStripeEvents(opts: {
  lookbackDays?: number;
  deadlineMs?: number;
  maxEvents?: number;
} = {}): Promise<ReconcileResult> {
  const lookbackDays = Math.min(Math.max(opts.lookbackDays ?? 7, 1), MAX_LOOKBACK_DAYS);
  const deadlineMs   = opts.deadlineMs ?? Date.now() + 45_000;
  const maxEvents    = opts.maxEvents ?? 300;

  const since = Math.floor(Date.now() / 1000) - lookbackDays * 24 * 60 * 60;

  const result: ReconcileResult = {
    scanned: 0, alreadyDone: 0, recovered: 0,
    failures: {}, truncated: false, lookbackDays,
  };

  // A Stripe a legújabbat adja előbb, mi viszont a LEGRÉGEBBIVEL kezdünk.
  // Ez nem kozmetika: a `checkout.session.completed` hozza létre az
  // előfizetés sorát, amit az `invoice.payment_succeeded` keres. Fordított
  // sorrendben a számla nem találna sort, és a `backfill`-re bízná magát —
  // működne, de feleslegesen a kerülőúton.
  const events: Stripe.Event[] = [];
  for await (const event of getStripe().events.list({
    types:   [...RECONCILED_EVENT_TYPES],
    created: { gte: since },
    limit:   100,
  })) {
    events.push(event);
    if (events.length >= maxEvents || Date.now() > deadlineMs) {
      result.truncated = true;
      break;
    }
  }
  events.reverse();

  result.scanned = events.length;

  for (const event of events) {
    if (Date.now() > deadlineMs) {
      result.truncated = true;
      break;
    }

    if (await alreadyProcessed(event.id)) {
      result.alreadyDone++;
      continue;
    }

    const failed = await handleStripeEvent(event);
    if (failed.length > 0) {
      // Nem jelöljük feldolgozottnak: a következő futás újra megpróbálja.
      // Ugyanaz a logika, mint a webhook nem-2xx válaszánál.
      result.failures[event.id] = failed;
      continue;
    }

    await markProcessed(event.id, event.type);
    result.recovered++;
  }

  return result;
}
