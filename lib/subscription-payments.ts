import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { subscriptionFeePercent, subscriptionPlatformFee } from "@/lib/stripe";

/**
 * A számlához tartozó PaymentIntent azonosítója.
 * A visszatérítés (`charge.refunded`) ez alapján találja meg a terhelést.
 */
export function invoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  for (const payment of invoice.payments?.data ?? []) {
    const pi = payment.payment?.payment_intent;
    if (pi) return typeof pi === "string" ? pi : pi.id;
  }
  return null;
}

/**
 * Egy számlához tartozó Stripe-előfizetés azonosítója.
 *
 * A használt API-verzióban (2026-03-25.dahlia) az `Invoice`-on már NINCS
 * `subscription` mező — az adat a `parent.subscription_details.subscription`
 * alatt van. A régi, lapos alakot is megnézzük, hogy a korábbi API-verzióval
 * rögzített, újraküldött események se essenek ki.
 */
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const nested = invoice.parent?.subscription_details?.subscription;
  if (nested) return typeof nested === "string" ? nested : nested.id;

  const flat = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  if (flat) return typeof flat === "string" ? flat : flat.id;

  return null;
}

/**
 * Egy sikeres havi terhelés lekönyvelése.
 *
 * A Stripe csak az első fizetésről küld `checkout.session.completed`-et, a
 * megújításokról `invoice.payment_succeeded` érkezik. Enélkül a második
 * hónaptól kezdve semmi nyoma nem maradt a befolyt pénznek.
 *
 * Idempotens: a `stripeInvoiceId` egyedi a táblában, és `createMany` +
 * `skipDuplicates` fut, így a Stripe újraküldése nem hoz létre második sort és
 * nem is dob hibát.
 *
 * A felosztást nem az adatbázisból „hisszük el”: a fizetett végösszeg a Stripe
 * számlájáról jön, a platform része pedig ugyanazzal a képlettel számolódik,
 * amivel a checkout az `application_fee_percent`-et beállította.
 *
 * @returns `recorded` = igaz, ha most jött létre a sor (nem duplikátum).
 */
export async function recordSubscriptionPayment(
  invoice: Stripe.Invoice
): Promise<{ recorded: boolean }> {
  const stripeSubId = invoiceSubscriptionId(invoice);
  const invoiceId   = invoice.id;
  if (!stripeSubId || !invoiceId) return { recorded: false };

  // Fillér → forint. A Stripe a legkisebb egységben számol.
  const totalPaid = Math.round((invoice.amount_paid ?? 0) / 100);
  if (totalPaid <= 0) return { recorded: false };

  const [subscription, sponsorship] = await Promise.all([
    prisma.subscription.findUnique({
      where:  { stripeSubId },
      select: { id: true, tier: { select: { amount: true } } },
    }),
    prisma.sponsorship.findUnique({
      where:  { stripeSubId },
      select: { id: true, amount: true },
    }),
  ]);

  // Nem hozzánk tartozó előfizetés – nincs mit könyvelni.
  if (!subscription && !sponsorship) return { recorded: false };

  const baseAmount  = subscription?.tier.amount ?? sponsorship?.amount ?? 0;
  const feePercent  = subscriptionFeePercent(baseAmount);
  const platformFee = subscriptionPlatformFee(totalPaid, feePercent);

  const paidAtSec = invoice.status_transitions?.paid_at;
  const paidAt    = paidAtSec ? new Date(paidAtSec * 1000) : new Date();

  const result = await prisma.subscriptionPayment.createMany({
    data: [{
      stripeInvoiceId: invoiceId,
      stripeSubId,
      stripePaymentIntentId: invoicePaymentIntentId(invoice),
      subscriptionId:  subscription?.id ?? null,
      sponsorshipId:   sponsorship?.id ?? null,
      totalPaid,
      platformFee,
      netAmount:       totalPaid - platformFee,
      paidAt,
    }],
    skipDuplicates: true,
  });

  return { recorded: result.count > 0 };
}
