import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

/**
 * Lemondás az időszak végén.
 *
 * A HIBA, AMIT EZ A RÉTEG JAVÍT
 *
 * A Stripe-ban a felhasználói lemondás `cancel_at_period_end`, tehát a már
 * kifizetett hónap végéig él az előfizetés. A sor viszont azonnal CANCELLED-re
 * állt, aminek három következménye volt:
 *
 *   • a támogató juttatása azonnal eltűnt, pedig fizetett érte;
 *   • a `TC-18-22` saját elfogadási feltétele sérült;
 *   • és mivel a feliratkozás duplikátum-ellenőrzése csak ACTIVE sort tilt, a
 *     támogató AZONNAL újra elő tudott fizetni ugyanarra a csomagra, miközben
 *     az első előfizetés még élt és ki volt fizetve — az ÁTFEDŐ IDŐSZAKRA
 *     KÉTSZER FIZETETT.
 *
 * Amit védeni kell:
 *
 * • A PERIÓDUS VÉGE ONNAN JÖJJÖN, AHOL VAN. Ebben az API-verzióban a
 *   `current_period_end` már NINCS a Subscription objektumon — a tételeken van.
 *   Ez ugyanaz a csapda, ami korábban az `invoice.subscription` mezővel némán
 *   elvitte a sikertelen fizetések ágát: a mező nem hibázik, csak `undefined`.
 * • A JELZŐ KÖVESSE A STRIPE-OT MINDKÉT IRÁNYBAN. Ha a támogató a Stripe
 *   oldalán VISSZAVONJA a lemondást, a jelzőnek törlődnie kell, különben egy
 *   élő, fizető előfizetés örökre „lemondva" maradna.
 * • A VÉGLEGES LEZÁRÁS VEGYE VISSZA A JELZŐT. Az időszak lejárt, nincs mire
 *   várni; a felületen „lemondva" a helyes, nem „lemondva, eddig aktív".
 */

const updates: { model: string; data: Record<string, unknown> }[] = [];

const prismaMock = {
  subscription: {
    updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      updates.push({ model: "subscription", data });
      return { count: 1 };
    },
    findUnique: async () => null,
    update:     async () => ({}),
  },
  sponsorship: {
    updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      updates.push({ model: "sponsorship", data });
      return { count: 1 };
    },
    findUnique: async () => null,
    update:     async () => ({}),
  },
  donation: { deleteMany: async () => ({ count: 0 }) },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email", () => ({
  sendPaymentFailedEmail: async () => {}, sendSponsorshipPaymentFailedEmail: async () => {},
}));
vi.mock("@/lib/notifications", () => ({
  createNotification: async () => {}, createNotifications: async () => {},
}));
vi.mock("@/lib/donations", () => ({
  fulfillDonation: async () => ({ donation: null, firstFulfilment: false }),
  notifyDonation:  async () => {},
}));
vi.mock("@/lib/subscription-payments", () => ({
  backfillSubscriptionPayments: async () => ({ recorded: 0 }),
  invoiceSubscriptionId:        () => null,
  recordSubscriptionPayment:    async () => ({ recorded: false }),
}));
vi.mock("@/lib/refunds", () => ({
  applyRefund: async () => ({ matched: false }), recordDispute: async () => {},
}));
vi.mock("@/lib/subscription-activation", () => ({
  activateSubscription:      async () => ({ created: false }),
  notifySubscriptionStarted: async () => {},
  activateSponsorship:       async () => ({ created: false }),
  notifySponsorshipStarted:  async () => {},
}));

const { subscriptionPeriodEnd } = await import("@/lib/stripe");
const { handleStripeEvent }     = await import("@/lib/stripe-events");

/** Előfizetés-objektum a Stripe alakjában, csak a vizsgált mezőkkel. */
function sub(fields: Partial<{
  cancel_at: number | null;
  cancel_at_period_end: boolean;
  status: string;
  itemPeriodEnds: number[];
}> = {}): Stripe.Subscription {
  return {
    id: "sub_teszt",
    status: fields.status ?? "active",
    cancel_at: fields.cancel_at ?? null,
    cancel_at_period_end: fields.cancel_at_period_end ?? false,
    items: {
      data: (fields.itemPeriodEnds ?? []).map((current_period_end) => ({ current_period_end })),
    },
  } as unknown as Stripe.Subscription;
}

function event(type: string, object: unknown): Stripe.Event {
  return { id: "evt_teszt", type, data: { object } } as unknown as Stripe.Event;
}

beforeEach(() => { updates.length = 0; });

describe("a periódus vége", () => {
  it("a cancel_at-ot használja, ha a Stripe kitöltötte", () => {
    const end = subscriptionPeriodEnd(sub({ cancel_at: 1_800_000_000 }));
    expect(end).toEqual(new Date(1_800_000_000 * 1000));
  });

  it("A TÉTELEKRŐL olvassa, ha nincs cancel_at", () => {
    // Ebben az API-verzióban a Subscription objektumon NINCS
    // `current_period_end` – ha onnan olvasnánk, mindig null lenne.
    const end = subscriptionPeriodEnd(sub({ itemPeriodEnds: [1_700_000_000] }));
    expect(end).toEqual(new Date(1_700_000_000 * 1000));
  });

  it("több tétel esetén a LEGKÉSŐBBI periódusvéget adja", () => {
    const end = subscriptionPeriodEnd(sub({ itemPeriodEnds: [1_700_000_000, 1_750_000_000] }));
    expect(end).toEqual(new Date(1_750_000_000 * 1000));
  });

  it("a cancel_at erősebb a tételeknél", () => {
    const end = subscriptionPeriodEnd(sub({ cancel_at: 1_800_000_000, itemPeriodEnds: [1_700_000_000] }));
    expect(end).toEqual(new Date(1_800_000_000 * 1000));
  });

  it("null, ha semmi nincs – nem dob, és nem talál ki dátumot", () => {
    expect(subscriptionPeriodEnd(sub())).toBeNull();
  });
});

describe("customer.subscription.updated", () => {
  it("átveszi a Stripe lemondás-jelzőjét és a periódus végét", async () => {
    const failed = await handleStripeEvent(event("customer.subscription.updated",
      sub({ cancel_at_period_end: true, cancel_at: 1_800_000_000 })));

    expect(failed).toEqual([]);
    expect(updates).toHaveLength(2); // előfizetés + virtuális örökbefogadás
    for (const u of updates) {
      expect(u.data.cancelAtPeriodEnd).toBe(true);
      expect(u.data.currentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
      // A státusz ACTIVE marad: a Stripe-nál is aktív, csak lejár.
      expect(u.data.status).toBe("ACTIVE");
    }
  });

  it("VISSZAVONT lemondásnál törli a jelzőt", async () => {
    // A támogató a Stripe számlázó portálján meggondolta magát. Enélkül egy
    // élő, fizető előfizetés örökre „lemondva" maradna a felületen.
    await handleStripeEvent(event("customer.subscription.updated",
      sub({ cancel_at_period_end: false, itemPeriodEnds: [1_900_000_000] })));

    for (const u of updates) {
      expect(u.data.cancelAtPeriodEnd).toBe(false);
      expect(u.data.status).toBe("ACTIVE");
    }
  });

  it("a sikertelen terhelés PAST_DUE-ba visz, és nem állítja lemondásra", async () => {
    await handleStripeEvent(event("customer.subscription.updated", sub({ status: "past_due" })));

    for (const u of updates) {
      expect(u.data.status).toBe("PAST_DUE");
      expect(u.data.cancelAtPeriodEnd).toBe(false);
    }
  });

  it("a Stripe-nál véglegesen lezárt előfizetés CANCELLED lesz, dátummal", async () => {
    await handleStripeEvent(event("customer.subscription.updated", sub({ status: "canceled" })));

    for (const u of updates) {
      expect(u.data.status).toBe("CANCELLED");
      expect(u.data.cancelledAt).toBeInstanceOf(Date);
    }
  });
});

describe("customer.subscription.deleted", () => {
  it("lezárja, és VISSZAVESZI a lemondás-jelzőt", async () => {
    // Az időszak lejárt: nincs mire várni, tehát a felületen „lemondva" a
    // helyes, nem „lemondva – eddig aktív".
    const failed = await handleStripeEvent(event("customer.subscription.deleted", sub()));

    expect(failed).toEqual([]);
    expect(updates).toHaveLength(2);
    for (const u of updates) {
      expect(u.data.status).toBe("CANCELLED");
      expect(u.data.cancelAtPeriodEnd).toBe(false);
      expect(u.data.cancelledAt).toBeInstanceOf(Date);
    }
  });
});
