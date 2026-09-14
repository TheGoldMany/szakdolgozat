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
  disputes:  [] as {
    stripeDisputeId: string; amount: number; status: string;
    stripePaymentIntentId?: string | null;
    donationId?: string | null; subscriptionPaymentId?: string | null;
  }[],
  notifications: [] as { type: string; title?: string; body?: string }[],
};

const prismaMock = {
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prismaMock),
  donation: {
    findUnique: async ({ where }: { where: { stripePaymentIntentId?: string; id?: string } }) => {
      if (where.id) return db.donation?.id === where.id ? db.donation : null;
      return where.stripePaymentIntentId === "pi_donation" ? db.donation : null;
    },
    update: async ({ data }: { data: { refundedAmount: number; refundedAt: Date } }) => {
      if (db.donation) { db.donation.refundedAmount = data.refundedAmount; db.donation.refundedAt = data.refundedAt; }
      return db.donation;
    },
  },
  subscriptionPayment: {
    findUnique: async ({ where }: { where: { stripePaymentIntentId?: string; id?: string } }) => {
      if (where.id) return db.payment?.id === where.id ? db.payment : null;
      return where.stripePaymentIntentId === "pi_sub" ? db.payment : null;
    },
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
  createNotifications: async (rows: { type: string; title?: string; body?: string }[]) => { db.notifications.push(...rows); },
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
  function dispute(
    id = "dp_1",
    status = "warning_needs_response",
    paymentIntent: string | null = null,
  ): Stripe.Dispute {
    return {
      id, charge: "ch_1", amount: 20_000 * 100, reason: "fraudulent", status,
      payment_intent: paymentIntent,
    } as unknown as Stripe.Dispute;
  }

  const disputeNotifications = () => db.notifications.filter((n) => n.type === "PAYMENT_DISPUTE");

  it("rögzíti a vitát és értesíti a super admint", async () => {
    await recordDispute(dispute());

    expect(db.disputes).toHaveLength(1);
    expect(db.disputes[0].amount).toBe(20_000);
    expect(disputeNotifications()).toHaveLength(1);
  });

  it("köztes státuszváltásnál frissít, de nem értesít újra", async () => {
    await recordDispute(dispute("dp_1", "warning_needs_response"));
    await recordDispute(dispute("dp_1", "needs_response"));

    expect(db.disputes).toHaveLength(1);
    expect(db.disputes[0].status).toBe("needs_response");
    expect(disputeNotifications()).toHaveLength(1);
  });

  it("elveszített vitánál MÉGIS szól – ez a legdrágább esemény a rendszerben", async () => {
    await recordDispute(dispute("dp_1", "needs_response"));
    await recordDispute(dispute("dp_1", "lost"));

    expect(db.disputes[0].status).toBe("lost");
    expect(disputeNotifications()).toHaveLength(2);
    expect(disputeNotifications()[1].title).toContain("elveszítve");
  });

  it("megnyert vitáról is szól, de más szöveggel", async () => {
    await recordDispute(dispute("dp_1", "needs_response"));
    await recordDispute(dispute("dp_1", "won"));

    expect(disputeNotifications()).toHaveLength(2);
    expect(disputeNotifications()[1].title).toContain("megnyerve");
  });

  it("a lezáró esemény újraküldése nem szól harmadszor", async () => {
    await recordDispute(dispute("dp_1", "needs_response"));
    await recordDispute(dispute("dp_1", "lost"));
    await recordDispute(dispute("dp_1", "lost"));

    expect(disputeNotifications()).toHaveLength(2);
  });

  it("visszavezeti az adományra, amit érint", async () => {
    await recordDispute(dispute("dp_1", "needs_response", "pi_donation"));

    expect(db.disputes[0].stripePaymentIntentId).toBe("pi_donation");
    expect(db.disputes[0].donationId).toBe("d1");
    expect(db.disputes[0].subscriptionPaymentId).toBeNull();
  });

  it("havi terhelésre is visszavezet", async () => {
    await recordDispute(dispute("dp_1", "needs_response", "pi_sub"));

    expect(db.disputes[0].subscriptionPaymentId).toBe("sp1");
    expect(db.disputes[0].donationId).toBeNull();
  });

  it("ismeretlen PaymentIntentnél üresen hagyja a visszavezetést, de rögzít", async () => {
    await recordDispute(dispute("dp_1", "needs_response", "pi_ismeretlen"));

    expect(db.disputes).toHaveLength(1);
    expect(db.disputes[0].donationId).toBeNull();
    expect(db.disputes[0].subscriptionPaymentId).toBeNull();
  });
});
