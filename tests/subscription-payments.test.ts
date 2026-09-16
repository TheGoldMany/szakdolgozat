import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

/**
 * A havi megújítások könyvelését ellenőrzi.
 *
 * Két dolog volt hibás:
 *   1. `invoice.payment_succeeded` egyáltalán nem volt kezelve, így a második
 *      hónaptól kezdve semmi nyoma nem maradt a befolyt pénznek;
 *   2. a számláról a `subscription` mezőt olvasta a kód, ami a használt API-
 *      verzióban nem létezik — emiatt a `payment_failed` ág sem futott le soha.
 */

interface Payment { stripeInvoiceId: string; totalPaid: number; platformFee: number; netAmount: number }

const db = {
  payments: [] as Payment[],
  subscription: null as { id: string; tier: { amount: number } } | null,
  sponsorship:  null as { id: string; amount: number } | null,
};

const prismaMock = {
  subscription: { findUnique: async () => db.subscription },
  sponsorship:  { findUnique: async () => db.sponsorship },
  subscriptionPayment: {
    createMany: async ({ data, skipDuplicates }: { data: Payment[]; skipDuplicates: boolean }) => {
      let count = 0;
      for (const row of data) {
        const dup = db.payments.some((p) => p.stripeInvoiceId === row.stripeInvoiceId);
        if (dup && skipDuplicates) continue;
        db.payments.push(row);
        count++;
      }
      return { count };
    },
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

/** A Stripe-tól visszaadott számlák a visszatöltés-teszthez. */
const stripeInvoices: unknown[] = [];
vi.mock("@/lib/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe")>();
  return {
    ...actual,
    getStripe: () => ({ invoices: { list: async () => ({ data: stripeInvoices }) } }),
  };
});

const { recordSubscriptionPayment, invoiceSubscriptionId, backfillSubscriptionPayments } = await import("@/lib/subscription-payments");

/** A használt API-verzió alakja: az előfizetés a parent alatt van. */
function invoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
  return {
    id: "in_1",
    amount_paid: 5_345 * 100, // egy 5 000 Ft-os csomag teljes havi terhelése
    status_transitions: { paid_at: 1_770_000_000 },
    parent: { subscription_details: { subscription: "sub_1" } },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

beforeEach(() => {
  db.payments = [];
  db.subscription = { id: "s1", tier: { amount: 5_000 } };
  db.sponsorship  = null;
});

describe("invoiceSubscriptionId", () => {
  it("a parent.subscription_details alól olvassa ki (jelenlegi API-alak)", () => {
    expect(invoiceSubscriptionId(invoice())).toBe("sub_1");
  });

  it("a régi, lapos alakot is elfogadja", () => {
    const legacy = { id: "in_2", subscription: "sub_old" } as unknown as Stripe.Invoice;
    expect(invoiceSubscriptionId(legacy)).toBe("sub_old");
  });

  it("kibontja az objektumként kapott előfizetést is", () => {
    const expanded = invoice({ parent: { subscription_details: { subscription: { id: "sub_exp" } } } });
    expect(invoiceSubscriptionId(expanded)).toBe("sub_exp");
  });

  it("null, ha semmilyen alakban nincs előfizetés", () => {
    expect(invoiceSubscriptionId({ id: "in_3" } as Stripe.Invoice)).toBeNull();
  });
});

describe("recordSubscriptionPayment", () => {
  it("lekönyveli a megújítást, és helyesen osztja fel az összeget", async () => {
    const { recorded } = await recordSubscriptionPayment(invoice());

    expect(recorded).toBe(true);
    expect(db.payments).toHaveLength(1);

    const p = db.payments[0];
    expect(p.totalPaid).toBe(5_345);
    // 5 000-es csomagnál a díjszázalék 6,45% → 5 345 × 6,45% ≈ 345
    expect(p.platformFee).toBe(345);
    // a menhely lényegében pontosan a csomag árát kapja
    expect(p.netAmount).toBe(5_000);
    expect(p.totalPaid).toBe(p.platformFee + p.netAmount);
  });

  it("a webhook újraküldése nem hoz létre második sort", async () => {
    await recordSubscriptionPayment(invoice());
    const second = await recordSubscriptionPayment(invoice());

    expect(second.recorded).toBe(false);
    expect(db.payments).toHaveLength(1);
  });

  it("külön számla külön sor", async () => {
    await recordSubscriptionPayment(invoice({ id: "in_1" }));
    await recordSubscriptionPayment(invoice({ id: "in_2" }));

    expect(db.payments).toHaveLength(2);
  });

  it("virtuális örökbefogadásnál a sponsorship összegéből számol", async () => {
    db.subscription = null;
    db.sponsorship  = { id: "sp1", amount: 2_000 };

    await recordSubscriptionPayment(invoice({ amount_paid: 2_153 * 100 }));

    const p = db.payments[0];
    expect(p.totalPaid).toBe(2_153);
    expect(p.netAmount).toBe(2_000);
  });

  it("nem hozzánk tartozó előfizetést nem könyvel", async () => {
    db.subscription = null;
    db.sponsorship  = null;

    const { recorded } = await recordSubscriptionPayment(invoice());

    expect(recorded).toBe(false);
    expect(db.payments).toHaveLength(0);
  });

  it("előfizetés-azonosító nélküli számlát kihagy", async () => {
    const { recorded } = await recordSubscriptionPayment({ id: "in_x", amount_paid: 100 } as Stripe.Invoice);
    expect(recorded).toBe(false);
  });

  it("nulla összegű számlát kihagy (pl. 100%-os kupon)", async () => {
    const { recorded } = await recordSubscriptionPayment(invoice({ amount_paid: 0 }));
    expect(recorded).toBe(false);
  });
});

describe("az elveszett első havi fizetés (sorrendi hiba)", () => {
  /**
   * A Stripe nem garantálja az események sorrendjét. Ha az
   * `invoice.payment_succeeded` megelőzi a `checkout.session.completed`-et,
   * az előfizetés sor még nem létezik, a fizetés csendben kiesik, és a Stripe
   * soha nem próbálja újra — mert 200-at kapott. Pont az ELSŐ, legfontosabb
   * terhelés maradt így könyveletlenül.
   *
   * A javítás nem az újrapróbálás kikényszerítése, hanem a visszatöltés:
   * amikor a sor létrejön, megkérdezzük a Stripe-tól a hozzá tartozó
   * számlákat, és lekönyveljük a kimaradtakat.
   */
  beforeEach(() => {
    stripeInvoices.length = 0;
  });

  it("fordított sorrendnél a fizetés először tényleg kiesik", async () => {
    db.subscription = null;  // a checkout még nem futott le
    db.sponsorship  = null;

    const { recorded } = await recordSubscriptionPayment(invoice());

    expect(recorded).toBe(false);
    expect(db.payments).toHaveLength(0);
  });

  it("a visszatöltés utólag lekönyveli a kimaradt első terhelést", async () => {
    // 1) a számla-esemény korán érkezik – nincs mihez kötni
    db.subscription = null;
    db.sponsorship  = null;
    await recordSubscriptionPayment(invoice());
    expect(db.payments).toHaveLength(0);

    // 2) megjön a checkout, létrejön az előfizetés
    db.subscription = { id: "s1", tier: { amount: 5_000 } };
    stripeInvoices.push(invoice());

    // 3) a visszatöltés pótolja
    const { recorded } = await backfillSubscriptionPayments("sub_1");

    expect(recorded).toBe(1);
    expect(db.payments).toHaveLength(1);
    expect(db.payments[0].totalPaid).toBe(5_345);
  });

  it("a visszatöltés nem könyvel duplán, ha a számla már bent van", async () => {
    db.subscription = { id: "s1", tier: { amount: 5_000 } };
    await recordSubscriptionPayment(invoice());   // normál sorrend: már lekönyvelve
    stripeInvoices.push(invoice());

    const { recorded } = await backfillSubscriptionPayments("sub_1");

    expect(recorded).toBe(0);
    expect(db.payments).toHaveLength(1);
  });

  it("több kimaradt számlát is pótol", async () => {
    db.subscription = { id: "s1", tier: { amount: 5_000 } };
    stripeInvoices.push(invoice({ id: "in_1" }), invoice({ id: "in_2" }));

    const { recorded } = await backfillSubscriptionPayments("sub_1");

    expect(recorded).toBe(2);
    expect(db.payments).toHaveLength(2);
  });
});
