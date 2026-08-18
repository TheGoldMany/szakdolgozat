import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { TiersManager } from "@/components/dashboard/tiers-manager";
import { cn } from "@/lib/utils";
import { resolveActingShelter } from "@/lib/acting-shelter";

export const metadata: Metadata = { title: "Előfizetési csomagok" };

function formatHUF(n: number) {
  return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
}

export default async function TiersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/tiers");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  const t = await getTranslations("dashboard");

  const acting    = await resolveActingShelter(session.user.id, session.user.role);
  const shelterId = acting.shelterId;

  // Super admin kiválasztott menhely nélkül → az összes menhely csomagjai
  if (!shelterId && acting.canSwitch) {
    const tiers = await prisma.donationTier.findMany({
      include: {
        shelter: { select: { name: true, city: true } },
        _count:  { select: { subscriptions: { where: { status: "ACTIVE" } } } },
      },
      orderBy: [{ shelter: { name: "asc" } }, { amount: "asc" }],
    });

    return (
      <div>
        <div className="mb-6 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{t("tiersTitle")}</h1>
          <PageInfo page="tiers" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {tiers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400">Nincs még előfizetési csomag a platformon.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Csomag neve</th>
                    <th className="px-4 py-3 text-left">Menhely</th>
                    <th className="px-4 py-3 text-left">Összeg / hó</th>
                    <th className="px-4 py-3 text-left">Aktív előfizetők</th>
                    <th className="px-4 py-3 text-left">Állapot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tiers.map((tier) => (
                    <tr key={tier.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{tier.name}</p>
                        {tier.description && (
                          <p className="text-xs text-gray-400 line-clamp-1">{tier.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {tier.shelter.name}
                        <span className="ml-1 text-xs text-gray-400">{tier.shelter.city}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-brand-600">{formatHUF(tier.amount)}</td>
                      <td className="px-4 py-3 text-gray-700">{tier._count.subscriptions}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          tier.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {tier.isActive ? "Aktív" : "Inaktív"}
                        </span>
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

  // Egy konkrét menhely csomagjai
  if (!shelterId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm text-gray-500">{t("tiersNoShelter")}</p>
      </div>
    );
  }

  const tiers = await prisma.donationTier.findMany({
    where:   { shelterId },
    include: {
      // Csak az élő előfizetések: a lemondottak beszámítása azt a látszatot
      // keltette, hogy több aktív támogató van. Ez a szám zárolja az összeg
      // szerkesztését is.
      _count: { select: { subscriptions: { where: { status: { in: ["ACTIVE", "PAST_DUE"] } } } } },
    },
    orderBy: { amount: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{t("tiersTitle")}</h1>
        <PageInfo page="tiers" />
      </div>
      <TiersManager tiers={tiers} shelterId={shelterId} />
    </div>
  );
}
