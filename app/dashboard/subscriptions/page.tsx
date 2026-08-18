import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { ExportButton } from "@/components/dashboard/export-button";
import { prisma } from "@/lib/prisma";
import { SubscriptionCancelButton } from "@/components/dashboard/subscription-cancel-button";
import { SubscriptionDeleteButton } from "@/components/dashboard/subscription-delete-button";
import { cn } from "@/lib/utils";
import { resolveActingShelter } from "@/lib/acting-shelter";

export const metadata: Metadata = { title: "Előfizetők" };

interface PageProps {
  searchParams: { status?: string };
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const acting    = await resolveActingShelter(session.user.id, session.user.role);
  const shelterId = acting.shelterId;

  const statusFilter = searchParams.status === "ACTIVE" || searchParams.status === "CANCELLED"
    ? searchParams.status
    : undefined;

  const subscriptions = await prisma.subscription.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(shelterId ? { tier: { shelterId } } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      tier: {
        select: {
          name: true,
          amount: true,
          shelter: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Visszatérő bevétel: a ténylegesen befolyt havi terhelések. Eddig sehol nem
  // látszott, mert a rendszer csak az előfizetés létrejöttét tárolta.
  const revenue = await prisma.subscriptionPayment.aggregate({
    where: shelterId
      ? {
          OR: [
            { subscription: { tier: { shelterId } } },
            { sponsorship:  { animal: { shelterId } } },
          ],
        }
      : {},
    _sum:   { netAmount: true, totalPaid: true },
    _count: true,
  });

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth  = await prisma.subscriptionPayment.aggregate({
    where: {
      paidAt: { gte: monthStart },
      ...(shelterId
        ? {
            OR: [
              { subscription: { tier: { shelterId } } },
              { sponsorship:  { animal: { shelterId } } },
            ],
          }
        : {}),
    },
    _sum: { netAmount: true },
  });

  const currentStatus = searchParams.status ?? "";

  const filterOptions = [
    { label: t("subscriptionsAll"),       value: "" },
    { label: t("subscriptionsActive"),    value: "ACTIVE" },
    { label: t("subscriptionsCancelled"), value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{t("subscriptionsTitle")}</h1>
        <PageInfo page="subscriptions" />
        <div className="ml-auto flex gap-2">
          <ExportButton type="subscribers" label={`${t("subscriptionsTitle")} CSV`} />
          <ExportButton type="donations"   label="Adományok CSV" />
        </div>
      </div>

      {/* Visszatérő bevétel */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">{t("subsRevenueThisMonth")}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">
            {(thisMonth._sum.netAmount ?? 0).toLocaleString("hu-HU")} Ft
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">{t("subsRevenueTotal")}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">
            {(revenue._sum.netAmount ?? 0).toLocaleString("hu-HU")} Ft
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-400">{t("subsPaymentsCount")}</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">{revenue._count}</p>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex gap-2">
        {filterOptions.map(({ label, value }) => (
          <Link
            key={value}
            href={value ? `/dashboard/subscriptions?status=${value}` : "/dashboard/subscriptions"}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              currentStatus === value
                ? "bg-brand-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {subscriptions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400">{t("subscriptionsEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">{t("subscriptionsColUser")}</th>
                  <th className="px-4 py-3 text-left">{t("subscriptionsColPlan")}</th>
                  <th className="px-4 py-3 text-left">{t("subscriptionsColAmount")}</th>
                  <th className="px-4 py-3 text-left">{t("subscriptionsColStatus")}</th>
                  <th className="px-4 py-3 text-left">{t("subscriptionsColSince")}</th>
                  <th className="px-4 py-3 text-left">{t("subscriptionsColCancel")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{sub.user?.name ?? "–"}</p>
                      <p className="text-gray-400">{sub.user?.email ?? "–"}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{sub.tier.name}</p>
                      {isSuperAdmin && (
                        <p className="text-gray-400">{sub.tier.shelter.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {sub.tier.amount.toLocaleString("hu-HU")} HUF/hó
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          sub.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {sub.status === "ACTIVE" ? t("subscriptionsStatusActive") : t("subscriptionsStatusCancelled")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">
                      {new Date(sub.createdAt).toLocaleDateString("hu-HU", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      {sub.status === "ACTIVE" ? (
                        <SubscriptionCancelButton subscriptionId={sub.id} />
                      ) : isSuperAdmin ? (
                        <SubscriptionDeleteButton subscriptionId={sub.id} />
                      ) : (
                        <span className="text-gray-300">–</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
