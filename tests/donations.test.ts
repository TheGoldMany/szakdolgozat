import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A `fulfillDonation` idempotenciáját ellenőrzi.
 *
 * A Prisma klienst mockoljuk egy pici, memóriában élő modellel, ami az
 * `updateMany({ where: { paidAt: null } })` szemantikáját utánozza: csak akkor
 * talál sort, ha a fizetés még nyitott. Pontosan ez a garancia, amire a valódi
 * kód épül (Postgresen a sorzárolás miatt párhuzamos hívásnál is csak egy
 * nyer), és pontosan ez az, ami korábban hiányzott — emiatt nőhetett duplán a
 * gyűjtés összege, ha a Stripe újraküldte a webhookot.
 */

interface Row { id: string; amount: number; campaignId: string | null; paidAt: Date | null; userId: string | null; isAnonymous: boolean }

const db = {
  donation: null as Row | null,
  raisedAmount: 0,
};

const prismaMock = {
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prismaMock),
  donation: {
    updateMany: async ({ where }: { where: { id: string; paidAt: null } }) => {
      const d = db.donation;
      if (!d || d.id !== where.id || d.paidAt !== null) return { count: 0 };
      d.paidAt = new Date();
      return { count: 1 };
    },
    findUnique: async () => db.donation,
  },
  campaign: {
    update: async ({ data }: { data: { raisedAmount: { increment: number } } }) => {
      db.raisedAmount += data.raisedAmount.increment;
      return {};
    },
    findUnique: async () => null,
  },
  user:         { findUnique: async () => null },
  shelterAdmin: { findMany:   async () => [] },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendDonationReceivedEmail: vi.fn(), sendDonationThankYouEmail: vi.fn(),
}));
vi.mock("@/lib/notifications", () => ({ createNotifications: vi.fn() }));

const { fulfillDonation } = await import("@/lib/donations");

beforeEach(() => {
  db.donation = { id: "d1", amount: 10_000, campaignId: "c1", paidAt: null, userId: "u1", isAnonymous: false };
  db.raisedAmount = 0;
});

describe("fulfillDonation", () => {
  it("az első lezárás beállítja a paidAt-ot és növeli a gyűjtés összegét", async () => {
    const { firstFulfilment } = await fulfillDonation("d1");

    expect(firstFulfilment).toBe(true);
    expect(db.donation!.paidAt).not.toBeNull();
    expect(db.raisedAmount).toBe(10_000);
  });

  it("a webhook újraküldése NEM növeli újra az összeget", async () => {
    await fulfillDonation("d1");
    const second = await fulfillDonation("d1");

    expect(second.firstFulfilment).toBe(false);
    expect(db.raisedAmount).toBe(10_000); // nem 20 000
  });

  it("tízszeres újraküldés után is pontosan egyszer számol", async () => {
    for (let i = 0; i < 10; i++) await fulfillDonation("d1");
    expect(db.raisedAmount).toBe(10_000);
  });

  it("a siker-oldal és a webhook együtt is csak egyszer könyvel", async () => {
    // siker-oldal ér előbb (a felhasználó visszatér, mielőtt a webhook megjön)
    const fromSuccessPage = await fulfillDonation("d1");
    // majd megérkezik a webhook is
    const fromWebhook     = await fulfillDonation("d1");

    expect(fromSuccessPage.firstFulfilment).toBe(true);
    expect(fromWebhook.firstFulfilment).toBe(false);
    expect(db.raisedAmount).toBe(10_000);
  });

  it("ha a webhook sosem jön meg, a siker-oldal maga könyveli az összeget", async () => {
    // Ez volt a második hiba: a siker-oldal korábban csak a paidAt-ot állította
    // be, a raisedAmount-hoz nem nyúlt, így a gyűjtés csíkja beragadt.
    const { firstFulfilment } = await fulfillDonation("d1");

    expect(firstFulfilment).toBe(true);
    expect(db.raisedAmount).toBe(10_000);
  });

  it("gyűjtéshez nem kötött adománynál nincs mit növelni", async () => {
    db.donation!.campaignId = null;

    const { firstFulfilment } = await fulfillDonation("d1");

    expect(firstFulfilment).toBe(true);
    expect(db.raisedAmount).toBe(0);
  });

  it("ismeretlen adomány-azonosítóra nem csinál semmit", async () => {
    const { firstFulfilment } = await fulfillDonation("nincs-ilyen");

    expect(firstFulfilment).toBe(false);
    expect(db.raisedAmount).toBe(0);
    expect(db.donation!.paidAt).toBeNull();
  });
});
