import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

/**
 * Visszatérítés és vitatott tétel.
 *
 * A kényes pont: a `charge.refunded` esemény a TELJES visszatérített összeget
 * adja meg (`amount_refunded`), nem a mostani részletet. Ha növelnénk, akkor
 * egy részleges majd teljes visszatérítés duplán vonna, a webhook újraküldése
 * pedig mínuszba vinné a gyűjtést.
 */

interface Donation { id: string; campaignId: string | null; amount: number; refundedAmount: number; refundedAt: Date | null }

const db = {
  donation:  null as Donation | null,
  payment:   null as { id: string; refundedAmount: number; refundedAt: Date | null } | null,
  raised:    10_000,
  disputes:  [] as { stripeDisputeId: string; amount: number; status: string }[],
  notifications: [] as { type: string }[],
};

const prismaMock = {
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prismaMock),
  donation: {
    findUnique: async ({ where }: { where: { stripePaymentIntentId: string } }) =>
      where.stripePaymentIntentId === "pi_donation" ? db.donation : null,
    update: async ({ data }: { data: { refundedAmount: number; refundedAt: Date } }) => {
      if (db.donation) { db.donation.refundedAmount = data.refundedAmount; db.donation.refundedAt = data.refundedAt; }
      return db.donation;
    },
  },
  subscriptionPayment: {
    findUnique: async ({ where }: { where: { stripePaymentIntentId: string } }) =>
      where.stripePaymentIntentId === "pi_sub" ? db.payment : null,
    update: async ({ data }: { data: { refundedAmount: number } }) => {
      if (db.payment) db.payment.refundedAmount = data.refundedAmount;
      return db.payment;
    },
  },
  campaign: {
    update: async ({ data }: { data: { raisedAmount: { decrement: number } } }) => {
      db.raised -= data.raisedAmount.decrement;
      return {};
    },
    findUnique: async () => ({ title: "Téli takarmány", userId: "u1", shelterId: null }),
  },
  shelterAdmin: { findMany: async () => [] },
  user:         { findMany: async () => [{ id: "super1" }] },
  paymentDispute: {
    findUnique: async ({ where }: { where: { stripeDisputeId: string } }) =>
      db.disputes.find((d) => d.stripeDisputeId === where.stripeDisputeId) ?? null,
    upsert: async ({ where, create, update }: { where: { stripeDisputeId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const found = db.disputes.find((d) => d.stripeDisputeId === where.stripeDisputeId);
      if (found) Object.assign(found, update);
      else db.disputes.push(create as never);
      return {};
    },
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  createNotifications: async (rows: { type: string }[]) => { db.notifications.push(...rows); },
}));

const { applyRefund, recordDispute } = await import("@/lib/refunds");

function charge(amountRefundedMinor: number, pi = "pi_donation"): Stripe.Charge {
  return { payment_intent: pi, amount_refunded: amountRefundedMinor } as unknown as Stripe.Charge;
}

beforeEach(() => {
  db.donation = { id: "d1", campaignId: "c1", amount: 10_000, refundedAmount: 0, refundedAt: null };
  db.payment  = { id: "sp1", refundedAmount: 0, refundedAt: null };
  db.raised   = 10_000;
  db.disputes = [];
  db.notifications = [];
});

describe("applyRefund", () => {
  it("teljes visszatérítésnél csökkenti a gyűjtés összegét", async () => {
    const r = await applyRefund(charge(10_000 * 100));

    expect(r.matched).toBe(true);
    expect(db.donation!.refundedAmount).toBe(10_000);
    expect(db.raised).toBe(0);
  });

  it("részleges visszatérítésnél csak a visszatérített részt vonja le", async () => {
    await applyRefund(charge(3_000 * 100));

    expect(db.donation!.refundedAmount).toBe(3_000);
    expect(db.raised).toBe(7_000);
  });

  it("a webhook újraküldése nem von le kétszer", async () => {
    await applyRefund(charge(10_000 * 100));
    await applyRefund(charge(10_000 * 100));

    expect(db.raised).toBe(0); // nem −10 000
  });

  it("részleges után teljes visszatérítésnél csak a különbözetet vonja", async () => {
    await applyRefund(charge(3_000 * 100));  // előbb 3 000
    await applyRefund(charge(10_000 * 100)); // majd a teljes összeg

    expect(db.donation!.refundedAmount).toBe(10_000);
    expect(db.raised).toBe(0); // 10 000 − 3 000 − 7 000
  });

  it("értesíti a gyűjtés tulajdonosát", async () => {
    await applyRefund(charge(10_000 * 100));

    expect(db.notifications.some((n) => n.type === "DONATION_REFUNDED")).toBe(true);
  });

  it("havi terhelés visszatérítését is megtalálja", async () => {
    const r = await applyRefund(charge(5_345 * 100, "pi_sub"));

    expect(r.matched).toBe(true);
    expect(db.payment!.refundedAmount).toBe(5_345);
    expect(db.raised).toBe(10_000); // gyűjtéshez nem tartozik, nem változik
  });

  it("ismeretlen fizetésre nem csinál semmit", async () => {
    const r = await applyRefund(charge(1_000 * 100, "pi_ismeretlen"));

    expect(r.matched).toBe(false);
    expect(db.raised).toBe(10_000);
  });

  it("PaymentIntent nélküli terhelést kihagy", async () => {
    const r = await applyRefund({ amount_refunded: 1000 } as unknown as Stripe.Charge);
    expect(r.matched).toBe(false);
  });
});

describe("recordDispute", () => {
  function dispute(id = "dp_1", status = "warning_needs_response"): Stripe.Dispute {
    return { id, charge: "ch_1", amount: 20_000 * 100, reason: "fraudulent", status } as unknown as Stripe.Dispute;
  }

  it("rögzíti a vitát és értesíti a super admint", async () => {
    await recordDispute(dispute());

    expect(db.disputes).toHaveLength(1);
    expect(db.disputes[0].amount).toBe(20_000);
    expect(db.notifications.filter((n) => n.type === "PAYMENT_DISPUTE")).toHaveLength(1);
  });

  it("státuszváltásnál frissít, de nem értesít újra", async () => {
    await recordDispute(dispute("dp_1", "warning_needs_response"));
    await recordDispute(dispute("dp_1", "lost"));

    expect(db.disputes).toHaveLength(1);
    expect(db.disputes[0].status).toBe("lost");
    // a második eseménynél nem jön újabb értesítés
    expect(db.notifications.filter((n) => n.type === "PAYMENT_DISPUTE")).toHaveLength(1);
  });
});
