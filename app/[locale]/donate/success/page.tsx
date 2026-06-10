import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("donate");
  return { title: t("successTitle") };
}

async function fulfillSession(sessionId: string) {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") return;

    const metadata = session.metadata ?? {};

    // Subscription: create record if not yet created by webhook
    if (metadata.tierId && metadata.userId && session.subscription) {
      const stripeSubId = String(session.subscription);
      await prisma.subscription.upsert({
        where:  { stripeSubId },
        update: {},
        create: {
          userId:      metadata.userId,
          tierId:      metadata.tierId,
          status:      "ACTIVE",
          stripeSubId,
        },
      });
    }

    // One-time donation: mark as paid if not yet done
    if (metadata.donationId) {
      await prisma.donation.updateMany({
        where: { id: metadata.donationId, paidAt: null },
        data:  { paidAt: new Date() },
      });
    }
  } catch {
    // Don't crash the page if Stripe call fails
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
