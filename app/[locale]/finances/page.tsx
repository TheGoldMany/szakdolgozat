import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionsList } from "@/components/profile/subscriptions-list";
import { SponsorshipsList } from "@/components/profile/sponsorships-list";
import { getTranslations } from "next-intl/server";
import { Wallet, RefreshCcw, Heart, Receipt } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("myFinances") };
}

export default async function FinancesPage() {
  const t = await getTranslations("finances");
  const tp = await getTranslations("profile");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/finances");

  const [donations, subscriptions, sponsorships, recurring] = await Promise.all([
    prisma.donation.findMany({
      where:   { userId: session.user.id, paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      select: {
        id:        true,
        amount:    true,
        refundedAmount: true,
        paidAt:    true,
        message:   true,
        isAnonymous: true,
        campaign:  { select: { title: true, shelter: { select: { name: true } } } },
      },
    }),
    prisma.subscription.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:          true,
        status:      true,
        createdAt:   true,
        cancelledAt: true,
        tier: {
          select: {
            name:    true,
            amount:  true,
            shelter: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    prisma.sponsorship.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:          true,
        status:      true,
        amount:      true,
        isPublic:    true,
        createdAt:   true,
        cancelledAt: true,
        animal:      { select: { name: true, slug: true } },
      },
    }),
    // A havi terhelések: eddig sehol nem jelentek meg, mert a rendszer csak az
    // előfizetés LÉTREJÖTTÉT tárolta, a megújításokat nem.
    prisma.subscriptionPayment.aggregate({
      where:  {
        OR: [
          { subscription: { userId: session.user.id } },
          { sponsorship:  { userId: session.user.id } },
        ],
      },
      _sum:   { totalPaid: true, refundedAmount: true },
      _count: true,
    }),
  ]);

  // A visszatérített részt nem számítjuk bele – az a pénz visszament.
  const totalDonated   = donations.reduce((s, d) => s + d.amount - d.refundedAmount, 0);
  const totalRecurring = (recurring._sum.totalPaid ?? 0) - (recurring._sum.refundedAmount ?? 0);
  const totalAll       = totalDonated + totalRecurring;
  const activeSubs   = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const activeSpons  = sponsorships.filter((s) => s.status === "ACTIVE").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">

        <h1 className="mb-2 text-2xl font-bold sm:text-3xl text-gray-900">{t("title")}</h1>
        <p className="mb-8 text-sm text-gray-500">{t("subtitle")}</p>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">{t("totalDonated")}</p>
            <p className="text-lg font-bold text-gray-900">{totalAll.toLocaleString("hu-HU")} Ft</p>
            {totalRecurring > 0 && (
              <p className="mt-0.5 text-[11px] leading-snug text-gray-400">
                {t("recurringBreakdown", {
                  oneOff:    totalDonated.toLocaleString("hu-HU"),
                  recurring: totalRecurring.toLocaleString("hu-HU"),
                })}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">{t("activeSubs")}</p>
            <p className="text-lg font-bold text-gray-900">{activeSubs}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-gray-400 mb-1">{t("activeSpons")}</p>
            <p className="text-lg font-bold text-gray-900">{activeSpons}</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Donations */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Receipt className="h-4 w-4 text-brand-500" />
              {t("myDonations")}
            </h2>
            {donations.length === 0 ? (
              <p className="text-sm text-gray-500">{t("noDonations")}</p>
            ) : (
              <div className="space-y-3">
                {donations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <div className="text-sm">
                      <p className="font-medium text-gray-800">
                        {d.campaign?.title ?? t("directDonation")}
                        {d.campaign?.shelter && (
                          <span className="ml-1 text-gray-400">· {d.campaign.shelter.name}</span>
                        )}
                      </p>
                      {d.message && (
                        <p className="mt-0.5 text-xs italic text-gray-400">&ldquo;{d.message}&rdquo;</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {d.paidAt ? new Date(d.paidAt).toLocaleDateString("hu-HU") : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-brand-600">
                      {d.amount.toLocaleString("hu-HU")} Ft
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscriptions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <RefreshCcw className="h-4 w-4 text-brand-500" />
              {tp("mySubscriptions")}
            </h2>
            <SubscriptionsList
              subscriptions={subscriptions.map((s) => ({
                ...s,
                createdAt:   s.createdAt.toISOString(),
                cancelledAt: s.cancelledAt?.toISOString() ?? null,
              }))}
            />
          </div>

          {/* Sponsorships */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Heart className="h-4 w-4 text-pink-500" />
              {tp("mySponsorships")}
            </h2>
            <SponsorshipsList
              sponsorships={sponsorships.map((s) => ({
                ...s,
                createdAt:   s.createdAt.toISOString(),
                cancelledAt: s.cancelledAt?.toISOString() ?? null,
              }))}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
