import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { fulfillDonation, notifyDonation } from "@/lib/donations";
import {
  activateSubscription, notifySubscriptionStarted,
  activateSponsorship,  notifySponsorshipStarted,
} from "@/lib/subscription-activation";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("donate");
  return { title: t("successTitle") };
}

/**
 * Tartalék útvonal, ha a webhook nem érkezik meg (vagy a felhasználó előbb ér
 * vissza, mint a Stripe hívása).
 *
 * Mindhárom fizetéstípus ugyanazokat a helpereket használja, mint a webhook,
 * ezért teljesen mindegy, melyik ér ide előbb: aki nyer, az értesít, a másik
 * néma marad. Korábban a virtuális örökbefogadás hiányzott innen — ha a
 * webhook elveszett, a támogató fizetett, a Stripe-nál élt az előfizetés, de
 * `Sponsorship` sor sosem jött létre, tehát sem a profilján, sem az állat
 * oldalán nem látszott semmi.
 */
async function fulfillSession(sessionId: string) {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") return;

    const metadata = session.metadata ?? {};
    const stripeSubId = session.subscription ? String(session.subscription) : null;

    // Havi előfizetés
    if (metadata.tierId && metadata.userId && stripeSubId) {
      const { created } = await activateSubscription({
        stripeSubId,
        userId: metadata.userId,
        tierId: metadata.tierId,
      });
      if (created) {
        await notifySubscriptionStarted(metadata.userId, metadata.tierId);
      }
    }

    // Virtuális örökbefogadás
    if (metadata.sponsorAnimalId && metadata.userId && stripeSubId) {
      const amount = parseInt(metadata.sponsorAmount ?? "0", 10) || 0;
      const { created } = await activateSponsorship({
        stripeSubId,
        userId:      metadata.userId,
        animalId:    metadata.sponsorAnimalId,
        amount,
        isPublic:    metadata.sponsorPublic !== "0",
        displayName: metadata.sponsorName || null,
      });
      if (created) {
        await notifySponsorshipStarted(metadata.userId, metadata.sponsorAnimalId, amount);
      }
    }

    // Egyszeri adomány: lezárás, ha a webhook még nem előzött meg minket.
    // Ugyanaz a helper fut, mint a webhookban, így a gyűjtés összege akkor is
    // helyes lesz, ha a webhook egyáltalán nem érkezik meg.
    if (metadata.donationId) {
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
      const { donation, firstFulfilment } = await fulfillDonation(metadata.donationId, paymentIntentId);
      if (donation && firstFulfilment) {
        await notifyDonation(donation);
      }
    }
  } catch (err) {
    // Az oldal ettől még megjelenik – a támogató fizetett, nem az ő hibája.
    // Naplózni viszont kötelező: eddig egy elhasalt Stripe-hívásnak semmi
    // nyoma nem maradt, és pont ez a tartalék útvonal a végső védőháló.
    console.error("donate/success fulfillSession error:", err);
  }
}

export default async function DonateSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const t = await getTranslations("donate");

  if (searchParams.session_id) {
    await fulfillSession(searchParams.session_id);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-500" />
        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          {t("donateSuccess")}
        </h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          {t("donateSuccessDesc")}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/donate"
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {t("backToDonate")}
          </Link>
          <Link
            href="/profile"
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("mySubscriptions")}
          </Link>
        </div>
      </div>
    </div>
  );
}
