import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Az előfizetés és a virtuális örökbefogadás aktiválásának idempotenciáját
 * ellenőrzi.
 *
 * A védett viselkedés: a Stripe *legalább egyszer* kézbesít, és ugyanazt a
 * `checkout.session.completed` eseményt újraküldheti. Az aktiválás korábban
 * `upsert`-tel ment, ami idempotens volt ugyan, de no-op `update`-tel elrejtette,
 * hogy létezett-e már a sor — az utána következő e-mail és app-értesítés ezért
 * feltétel nélkül futott, és a támogató kétszer kapta meg a visszaigazolást.
 *
 * A `createMany` + `skipDuplicates` `count`-ja pontosan azt adja vissza, amin az
 * értesítés múlik: most jött-e létre a sor.
 */

interface Sub { userId: string; tierId: string; stripeSubId: string | null }
interface Spon { userId: string; animalId: string; amount: number; stripeSubId: string | null }

const db = {
  subscriptions: [] as Sub[],
  sponsorships:  [] as Spon[],
};

/** A Postgres unique index szemantikája: NULL-ok nem ütköznek egymással. */
function collides(existing: (string | null)[], incoming: string | null): boolean {
  if (incoming === null) return false;
  return existing.includes(incoming);
}

const prismaMock = {
  subscription: {
    createMany: async ({ data }: { data: Sub[] }) => {
      let count = 0;
      for (const row of data) {
        if (collides(db.subscriptions.map((s) => s.stripeSubId), row.stripeSubId)) continue;
        db.subscriptions.push(row);
        count++;
      }
      return { count };
    },
  },
  sponsorship: {
    createMany: async ({ data }: { data: Spon[] }) => {
      let count = 0;
      for (const row of data) {
        if (collides(db.sponsorships.map((s) => s.stripeSubId), row.stripeSubId)) continue;
        db.sponsorships.push(row);
        count++;
      }
      return { count };
    },
  },
  user:         { findUnique: async () => ({ email: "tamogato@example.com", name: "Támogató" }) },
  donationTier: {
    findUnique: async () => ({
      id: "t1", name: "Tappancs", amount: 5_000, shelterId: "sh1",
      shelter: { name: "Boldog Tappancs", slug: "boldog-tappancs" },
    }),
  },
  animal:       { findUnique: async () => ({ name: "Bogáncs", slug: "bogancs", shelterId: "sh1" }) },
  shelterAdmin: { findMany:   async () => [{ userId: "admin1" }] },
};

const sentEmails: string[] = [];
const sentNotifications: string[] = [];

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendSubscriptionConfirmationEmail: async () => { sentEmails.push("subscription"); },
  sendSponsorshipStartedEmail:       async () => { sentEmails.push("sponsorship"); },
}));
vi.mock("@/lib/notifications", () => ({
  createNotification:  async () => { sentNotifications.push("one"); },
  createNotifications: async (rows: unknown[]) => { sentNotifications.push(`many:${rows.length}`); },
}));

const {
  activateSubscription, notifySubscriptionStarted,
  activateSponsorship,  notifySponsorshipStarted,
} = await import("@/lib/subscription-activation");

beforeEach(() => {
  db.subscriptions = [];
  db.sponsorships  = [];
  sentEmails.length = 0;
  sentNotifications.length = 0;
});

/** Amit a webhook csinál: aktivál, és CSAK az első alkalommal értesít. */
async function deliverSubscriptionEvent() {
  const { created } = await activateSubscription({ stripeSubId: "sub_1", userId: "u1", tierId: "t1" });
  if (created) await notifySubscriptionStarted("u1", "t1");
  return created;
}

async function deliverSponsorshipEvent() {
  const { created } = await activateSponsorship({
    stripeSubId: "sub_2", userId: "u1", animalId: "a1",
    amount: 2_000, isPublic: true, displayName: null,
  });
  if (created) await notifySponsorshipStarted("u1", "a1", 2_000);
  return created;
}

describe("activateSubscription", () => {
  it("az első aktiválás létrehozza a sort és jelzi, hogy ő volt az első", async () => {
    expect(await deliverSubscriptionEvent()).toBe(true);
    expect(db.subscriptions).toHaveLength(1);
  });

  it("a webhook újraküldése NEM hoz létre második sort és NEM küld második levelet", async () => {
    await deliverSubscriptionEvent();
    const secondCreated = await deliverSubscriptionEvent();

    expect(secondCreated).toBe(false);
    expect(db.subscriptions).toHaveLength(1);
    // pontosan egy visszaigazoló levél, akárhányszor is érkezik az esemény
    expect(sentEmails.filter((e) => e === "subscription")).toHaveLength(1);
  });

  it("háromszori kézbesítés után is egy értesítés-köteg ment ki", async () => {
    await deliverSubscriptionEvent();
    await deliverSubscriptionEvent();
    await deliverSubscriptionEvent();

    // egy személyes értesítés + egy adminoknak szóló köteg
    expect(sentNotifications).toEqual(["one", "many:1"]);
  });

  it("külön Stripe-előfizetés külön sort kap", async () => {
    await activateSubscription({ stripeSubId: "sub_1", userId: "u1", tierId: "t1" });
    await activateSubscription({ stripeSubId: "sub_masik", userId: "u2", tierId: "t1" });

    expect(db.subscriptions).toHaveLength(2);
  });
});

describe("activateSponsorship", () => {
  it("az első aktiválás létrehozza a sort", async () => {
    expect(await deliverSponsorshipEvent()).toBe(true);
    expect(db.sponsorships).toHaveLength(1);
  });

  it("a webhook újraküldése nem duplázza sem a sort, sem a levelet", async () => {
    await deliverSponsorshipEvent();
    const secondCreated = await deliverSponsorshipEvent();

    expect(secondCreated).toBe(false);
    expect(db.sponsorships).toHaveLength(1);
    expect(sentEmails.filter((e) => e === "sponsorship")).toHaveLength(1);
  });
});

describe("a hiba, ami ezt kiváltotta", () => {
  it("üres stringes kulccsal minden kézbesítés új árva sort hozott volna létre", async () => {
    // A régi kód `where: { stripeSubId: stripeSubId ?? "" }`-vel keresett, és
    // hiányzó azonosítónál `stripeSubId: null` értékkel hozott létre sort.
    // Postgresen több NULL is megfér egy unique indexben, ezért az ütközés-
    // védelem nem lépett működésbe. Ezt a `where`-t vettük ki; az új kód
    // azonosító nélkül hibát dob ahelyett, hogy némán szemetelne.
    await prismaMock.subscription.createMany({ data: [{ userId: "u1", tierId: "t1", stripeSubId: null }] });
    await prismaMock.subscription.createMany({ data: [{ userId: "u1", tierId: "t1", stripeSubId: null }] });

    expect(db.subscriptions).toHaveLength(2); // két árva sor ugyanarra a fizetésre
  });
});
