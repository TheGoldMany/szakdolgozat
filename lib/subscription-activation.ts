import { prisma } from "@/lib/prisma";
import { sendSubscriptionConfirmationEmail, sendSponsorshipStartedEmail } from "@/lib/email";
import { createNotification, createNotifications } from "@/lib/notifications";

/**
 * Havi előfizetés és virtuális örökbefogadás aktiválása — pontosan egyszer.
 *
 * Ugyanaz a minta, mint az egyszeri adománynál (`lib/donations.ts`): az
 * aktiválás megmondja, hogy MOST jött-e létre a sor, és értesíteni csak akkor
 * szabad. Korábban az `upsert` idempotens volt ugyan, de az utána következő
 * e-mail és értesítés feltétel nélkül futott — a Stripe egyetlen újraküldése
 * elég volt ahhoz, hogy a támogató kétszer kapja meg a visszaigazolást.
 */

function huf(amount: number): string {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency", currency: "HUF", maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Miért `createMany` + `skipDuplicates` és nem `upsert`?
 *
 * Az `upsert` no-op `update`-tel elrejti, hogy létezett-e már a sor — épp azt
 * az információt, amin az értesítés múlik. A `createMany` `count`-ja viszont
 * pontosan ezt adja vissza, ütközéskor pedig nem dob hibát. Ugyanezt használja
 * a `recordSubscriptionPayment` is.
 */

export interface ActivateSubscriptionInput {
  stripeSubId: string;
  userId:      string;
  tierId:      string;
}

/** @returns `created` = igaz, ha most ez a hívás hozta létre az előfizetést. */
export async function activateSubscription(
  input: ActivateSubscriptionInput
): Promise<{ created: boolean }> {
  const result = await prisma.subscription.createMany({
    data: [{
      userId:      input.userId,
      tierId:      input.tierId,
      status:      "ACTIVE",
      stripeSubId: input.stripeSubId,
    }],
    skipDuplicates: true,
  });
  return { created: result.count > 0 };
}

/**
 * Értesítések egy elindult előfizetésről: a támogatónak app-értesítés és
 * e-mail, a menhely adminjainak app-értesítés.
 *
 * Csak `created === true` esetén hívd. Sosem dob: egy elhasalt levél nem
 * buktathatja el az aktiválást, és nem kérhet újraküldést a Stripe-tól.
 */
export async function notifySubscriptionStarted(userId: string, tierId: string): Promise<void> {
  try {
    const [user, tier] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      prisma.donationTier.findUnique({
        where:   { id: tierId },
        include: { shelter: { select: { name: true, slug: true } } },
      }),
    ]);
    if (!user || !tier?.shelter) return;

    const amountStr = huf(tier.amount);

    await createNotification({
      userId,
      type:  "SUBSCRIPTION_STARTED",
      title: "Előfizetés aktiválva",
      body:  `${tier.name} – ${amountStr}/hó (${tier.shelter.name})`,
      href:  `/shelters/${tier.shelter.slug}`,
    });

    const admins = await prisma.shelterAdmin.findMany({
      where:  { shelterId: tier.shelterId },
      select: { userId: true },
    });
    if (admins.length > 0) {
      await createNotifications(admins.map((a) => ({
        userId: a.userId,
        type:   "DONATION_RECEIVED" as const,
        title:  "Új előfizető",
        body:   `${user.name ?? "Ismeretlen"} – ${tier.name} (${amountStr}/hó)`,
        href:   "/dashboard/subscribers",
      })));
    }

    if (user.email) {
      await sendSubscriptionConfirmationEmail({
        to:          user.email,
        name:        user.name ?? "Felhasználó",
        shelterName: tier.shelter.name,
        tierName:    tier.name,
        amount:      tier.amount,
        shelterSlug: tier.shelter.slug,
      });
    }
  } catch (err) {
    console.error("notifySubscriptionStarted error:", err);
  }
}

export interface ActivateSponsorshipInput {
  stripeSubId:  string;
  userId:       string;
  animalId:     string;
  amount:       number;
  isPublic:     boolean;
  displayName:  string | null;
}

/** @returns `created` = igaz, ha most ez a hívás hozta létre a támogatást. */
export async function activateSponsorship(
  input: ActivateSponsorshipInput
): Promise<{ created: boolean }> {
  const result = await prisma.sponsorship.createMany({
    data: [{
      animalId:    input.animalId,
      userId:      input.userId,
      amount:      input.amount,
      isPublic:    input.isPublic,
      displayName: input.displayName,
      status:      "ACTIVE",
      stripeSubId: input.stripeSubId,
    }],
    skipDuplicates: true,
  });
  return { created: result.count > 0 };
}

/**
 * Értesítések egy elindult virtuális örökbefogadásról.
 * Csak `created === true` esetén hívd. Sosem dob.
 */
export async function notifySponsorshipStarted(
  userId: string, animalId: string, amount: number
): Promise<void> {
  try {
    const animal = await prisma.animal.findUnique({
      where:  { id: animalId },
      select: { name: true, slug: true, shelterId: true },
    });
    if (!animal) return;

    const amountStr = huf(amount);

    await createNotification({
      userId,
      type:  "SPONSORSHIP_STARTED",
      title: "Virtuális örökbefogadás aktiválva",
      body:  `${animal.name} – ${amountStr}/hó. Köszönjük a támogatást!`,
      href:  `/animals/${animal.slug}`,
    });

    const admins = await prisma.shelterAdmin.findMany({
      where:  { shelterId: animal.shelterId },
      select: { userId: true },
    });
    if (admins.length > 0) {
      await createNotifications(admins.map((a) => ({
        userId: a.userId,
        type:   "DONATION_RECEIVED" as const,
        title:  "Új virtuális gazdi",
        body:   `${animal.name} – ${amountStr}/hó`,
        href:   "/dashboard/animals",
      })));
    }

    const sponsor = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true, name: true },
    });
    if (sponsor?.email) {
      await sendSponsorshipStartedEmail({
        to:         sponsor.email,
        name:       sponsor.name ?? "Felhasználó",
        animalName: animal.name,
        animalSlug: animal.slug,
        amount,
      });
    }
  } catch (err) {
    console.error("notifySponsorshipStarted error:", err);
  }
}
