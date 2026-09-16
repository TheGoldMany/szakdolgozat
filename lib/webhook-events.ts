import { prisma } from "@/lib/prisma";

/**
 * Esemény-szintű deduplikáció a Stripe-webhookhoz.
 *
 * A Stripe *legalább egyszer* kézbesít. Az egyes ágak külön-külön idempotensek
 * (lásd `fulfillDonation`, `activateSubscription`, `recordSubscriptionPayment`),
 * ez a réteg fölöttük a gyors kilépés: a már végigfutott eseményt meg se
 * próbáljuk újra feldolgozni.
 *
 * A sorrend szándékos: **a jelölés a feldolgozás UTÁN történik**, nem előtte.
 * Ha az elején foglalnánk le az eseményt, egy közben történő összeomlás örökre
 * „feldolgozottnak" jelölné azt, amit valójában senki nem végzett el — és mivel
 * a Stripe ilyenkor a mi 200-as válaszunkat sem kapta meg, az újraküldés is
 * hatástalan lenne. Így viszont a legrosszabb eset az, hogy egy párhuzamosan
 * érkező duplikátum még átjut a szűrőn, amit az ágak idempotenciája fog meg.
 */

/** Feldolgoztuk-e már ezt az eseményt? */
export async function alreadyProcessed(eventId: string): Promise<boolean> {
  const seen = await prisma.processedWebhookEvent.findUnique({
    where:  { id: eventId },
    select: { id: true },
  });
  return seen !== null;
}

/**
 * Az esemény megjelölése feldolgozottként. Csak hibátlan feldolgozás után hívd.
 *
 * Sosem dob: ha a jelölés elhasal, az esemény már el van végezve, és egy
 * esetleges újraküldést az ágak idempotenciája úgyis megfog. Ezért nem éri meg
 * emiatt hibára futtatni a választ és újraküldést kérni a Stripe-tól.
 */
export async function markProcessed(eventId: string, type: string): Promise<void> {
  try {
    await prisma.processedWebhookEvent.createMany({
      data:           [{ id: eventId, type }],
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("markProcessed error:", err);
  }
}
