import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

/** Fillér → forint. A Stripe a legkisebb egységben számol. */
function toForint(minor: number): number {
  return Math.round(minor / 100);
}

/**
 * Visszatérítés feldolgozása.
 *
 * A `charge.refunded` esemény a teljes visszatérített összeget adja meg
 * (`amount_refunded`), nem a mostani részletet – ezért nem növelünk, hanem
 * BEÁLLÍTJUK az értéket, és a gyűjtés összegét a különbözettel csökkentjük.
 * Így a részleges, majd teljes visszatérítés sem számol duplán, és a webhook
 * újraküldése sem visz mínuszba semmit.
 *
 * A gyűjtés `raisedAmount`-ja azért csökken, mert különben egy visszatérített
 * adomány örökre benne maradna a haladásjelzőben.
 */
export async function applyRefund(charge: Stripe.Charge): Promise<{ matched: boolean }> {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;
  if (!paymentIntentId) return { matched: false };

  const refundedTotal = toForint(charge.amount_refunded ?? 0);
  if (refundedTotal <= 0) return { matched: false };

  // ── Egyszeri adomány ──────────────────────────────────────────────────────
  const donation = await prisma.donation.findUnique({
    where:  { stripePaymentIntentId: paymentIntentId },
    select: { id: true, campaignId: true, refundedAmount: true, amount: true },
  });

  if (donation) {
    const delta = refundedTotal - donation.refundedAmount;
    if (delta <= 0) return { matched: true }; // már feldolgoztuk

    await prisma.$transaction(async (tx) => {
      await tx.donation.update({
        where: { id: donation.id },
        data:  { refundedAt: new Date(), refundedAmount: refundedTotal },
      });
      if (donation.campaignId) {
        await tx.campaign.update({
          where: { id: donation.campaignId },
          data:  { raisedAmount: { decrement: delta } },
        });
      }
    });

    // A gyűjtés összege most csökkent – a tulajdonosnak tudnia kell, miért.
    await notifyRefund(donation.campaignId, delta).catch((err) =>
      console.error("refund notification error:", err)
    );
    return { matched: true };
  }

  // ── Havi terhelés ─────────────────────────────────────────────────────────
  const payment = await prisma.subscriptionPayment.findUnique({
    where:  { stripePaymentIntentId: paymentIntentId },
    select: { id: true, refundedAmount: true },
  });

  if (payment) {
    if (refundedTotal <= payment.refundedAmount) return { matched: true };
    await prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data:  { refundedAt: new Date(), refundedAmount: refundedTotal },
    });
    return { matched: true };
  }

  return { matched: false };
}

/** A gyűjtés tulajdonosának szólunk, ha az összeg visszatérítés miatt csökkent. */
async function notifyRefund(campaignId: string | null, amount: number): Promise<void> {
  if (!campaignId) return;

  const campaign = await prisma.campaign.findUnique({
    where:  { id: campaignId },
    select: { title: true, userId: true, shelterId: true },
  });
  if (!campaign) return;

  const admins = campaign.shelterId
    ? await prisma.shelterAdmin.findMany({
        where:  { shelterId: campaign.shelterId },
        select: { userId: true },
      })
    : [];
  const userIds = admins.length > 0
    ? admins.map((a) => a.userId)
    : campaign.userId ? [campaign.userId] : [];
  if (userIds.length === 0) return;

  const amountStr = new Intl.NumberFormat("hu-HU", {
    style: "currency", currency: "HUF", maximumFractionDigits: 0,
  }).format(amount);

  await createNotifications(userIds.map((userId) => ({
    userId,
    type:  "DONATION_REFUNDED" as const,
    title: "Adomány visszatérítve",
    body:  `${amountStr} visszatérítésre került (${campaign.title}). A gyűjtés összege ennyivel csökkent.`,
    href:  "/dashboard",
  })));
}

/**
 * Vitatott tétel (chargeback) rögzítése és jelzése a super adminoknak.
 *
 * Destination charge-nál a vitatott összeg és a Stripe vitadíja is a PLATFORM
 * egyenlegéről megy – akkor is, ha a pénz már a gyűjtőnél van. Ez a legdrágább
 * esemény a rendszerben, ezért nem elég naplózni: szólni kell, mert a Stripe-on
 * határidőre bizonyítékot kell feltölteni.
 */
export async function recordDispute(dispute: Stripe.Dispute): Promise<void> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? "";
  const amount   = toForint(dispute.amount ?? 0);

  const existing = await prisma.paymentDispute.findUnique({
    where:  { stripeDisputeId: dispute.id },
    select: { id: true },
  });

  await prisma.paymentDispute.upsert({
    where:  { stripeDisputeId: dispute.id },
    update: { status: dispute.status, amount, reason: dispute.reason },
    create: {
      stripeDisputeId: dispute.id,
      stripeChargeId:  chargeId,
      amount,
      reason: dispute.reason,
      status: dispute.status,
    },
  });

  // Csak az első alkalommal értesítünk – a Stripe a státuszváltásokat is küldi.
  if (existing) return;

  const supers = await prisma.user.findMany({
    where:  { role: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (supers.length === 0) return;

  const amountStr = new Intl.NumberFormat("hu-HU", {
    style: "currency", currency: "HUF", maximumFractionDigits: 0,
  }).format(amount);

  await createNotifications(
    supers.map((s) => ({
      userId: s.id,
      type:   "PAYMENT_DISPUTE" as const,
      title:  "Vitatott fizetés érkezett",
      body:   `${amountStr} – indok: ${dispute.reason}. A Stripe-on határidőre bizonyítékot kell feltölteni, különben az összeg és a vitadíj is a platformot terheli.`,
      href:   "/dashboard/audit",
    }))
  ).catch((err) => console.error("dispute notification error:", err));
}
