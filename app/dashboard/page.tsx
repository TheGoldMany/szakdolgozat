import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ApplicationStatus, SubscriptionStatus, CampaignStatus, FormStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Áttekintés" };

const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
  INVITED:   { label: "Meghívva",        color: "bg-purple-100 text-purple-700" },
  PENDING:   { label: "Várakozó",        color: "bg-yellow-100 text-yellow-700" },
  REVIEWING: { label: "Elbírálás alatt", color: "bg-blue-100 text-blue-700" },
  APPROVED:  { label: "Elfogadva",       color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "Elutasítva",      color: "bg-red-100 text-red-700" },
  WITHDRAWN: { label: "Visszavont",      color: "bg-gray-100 text-gray-500" },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id } });
    shelterId = admin?.shelterId;
  }

  const shelterFilter = shelterId ? { shelterId } : {};

  if (isSuperAdmin) {
    // ── SUPER ADMIN view ──────────────────────────────────────────────────
    const [
      totalUsers,
      totalShelters,
      totalAnimals,
      totalApplications,
      activeSubs,
      paidDonationsAgg,
      pendingCampaigns,
      pendingForms,
      recentApps,
      recentDonations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.shelter.count(),
      prisma.animal.count(),
      prisma.adoptionApplication.count(),
      prisma.subscription.findMany({
        where: { status: SubscriptionStatus.ACTIVE },
        include: { tier: { select: { amount: true } } },
      }),
      prisma.donation.aggregate({
        where: { paidAt: { not: null } },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.campaign.count({ where: { status: CampaignStatus.PENDING } }),
      prisma.applicationForm.count({ where: { status: FormStatus.PENDING_APPROVAL } }),
      prisma.adoptionApplication.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user:   { select: { name: true, email: true } },
          animal: { select: { name: true, shelter: { select: { name: true } } } },
        },
      }),
      prisma.donation.findMany({
        where: { paidAt: { not: null } },
        orderBy: { paidAt: "desc" },
        take: 5,
        include: { campaign: { select: { title: true } } },
      }),
    ]);

    const monthlyRevenue = activeSubs.reduce((sum, s) => sum + s.tier.amount, 0);
    const activeSubsCount = activeSubs.length;

    const totalDonationsCount = paidDonationsAgg._count.id;
    const totalDonationsAmount = paidDonationsAgg._sum.amount ?? 0;

    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Áttekintés</h1>

        {/* Row 1: Core counts */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Felhasználók",  value: totalUsers,        color: "text-gray-700"  },
            { label: "Menhelyek",     value: totalShelters,     color: "text-blue-700"  },
            { label: "Állatok",       value: totalAnimals,      color: "text-green-700" },
            { label: "Kérelmek",      value: totalApplications, color: "text-brand-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
              <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Row 2: Revenue & donations */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Aktív előfizetések</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">{activeSubsCount}</p>
            <p className="mt-1 text-sm text-gray-400">
              Havi bevétel:{" "}
              <span className="font-semibold text-purple-600">
                {monthlyRevenue.toLocaleString("hu-HU")} HUF
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Teljesített adományok</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{totalDonationsCount}</p>
            <p className="mt-1 text-sm text-gray-400">
              Összesen:{" "}
              <span className="font-semibold text-emerald-600">
                {totalDonationsAmount.toLocaleString("hu-HU")} HUF
              </span>
            </p>
          </div>
        </div>

        {/* Row 3: Pending approvals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/campaigns"
            className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm transition-colors hover:bg-orange-100"
          >
            <p className="text-xs font-medium text-orange-600">Kampány jóváhagyások</p>
            <p className="mt-2 text-3xl font-bold text-orange-700">{pendingCampaigns}</p>
            <p className="mt-1 text-sm font-medium text-orange-500">Jóváhagyások →</p>
          </Link>
          <Link
            href="/dashboard/campaigns"
            className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 shadow-sm transition-colors hover:bg-yellow-100"
          >
            <p className="text-xs font-medium text-yellow-600">Kérvény sablon jóváhagyások</p>
            <p className="mt-2 text-3xl font-bold text-yellow-700">{pendingForms}</p>
            <p className="mt-1 text-sm font-medium text-yellow-500">Jóváhagyások →</p>
          </Link>
        </div>

        {/* Recent applications */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Legutóbbi kérelmek</h2>
          </div>
          {recentApps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">Nincs kérelem.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Állat</th>
                    <th className="hidden px-4 py-3 text-left sm:table-cell">Menhely</th>
                    <th className="hidden px-4 py-3 text-left md:table-cell">Kérelmező</th>
                    <th className="px-4 py-3 text-left">Státusz</th>
                    <th className="px-4 py-3 text-left">Dátum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentApps.map((app) => {
                    const st = STATUS_LABELS[app.status];
                    return (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{app.animal.name}</td>
                        <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell">
                          {app.animal.shelter.name}
                        </td>
                        <td className="hidden px-4 py-2.5 text-gray-500 md:table-cell">
                          {app.user.name ?? app.user.email}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.color)}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400">
                          {new Date(app.createdAt).toLocaleDateString("hu-HU", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent donations */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Legutóbbi adományok</h2>
          </div>
          {recentDonations.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">Nincs teljesített adomány.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentDonations.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-700">
                    {d.campaign?.title ?? "Ismeretlen kampány"}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-emerald-600">
                      {d.amount.toLocaleString("hu-HU")} HUF
                    </span>
                    <span className="text-xs text-gray-400">
                      {d.paidAt
                        ? new Date(d.paidAt).toLocaleDateString("hu-HU", {
                            year: "numeric", month: "short", day: "numeric",
                          })
                        : "–"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── SHELTER ADMIN view ────────────────────────────────────────────────
  const [
    totalAnimals,
    availableAnimals,
    adoptedAnimals,
    pendingApps,
    totalApps,
    activeSubsCount,
    donationsAgg,
  ] = await Promise.all([
    prisma.animal.count({ where: shelterFilter }),
    prisma.animal.count({ where: { ...shelterFilter, status: AnimalStatus.AVAILABLE } }),
    prisma.animal.count({ where: { ...shelterFilter, status: AnimalStatus.ADOPTED } }),
    prisma.adoptionApplication.count({
      where: { status: ApplicationStatus.PENDING, ...(shelterId && { animal: { shelterId } }) },
    }),
    prisma.adoptionApplication.count({ where: shelterId ? { animal: { shelterId } } : {} }),
    prisma.subscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        ...(shelterId && { tier: { shelterId } }),
      },
    }),
    prisma.donation.aggregate({
      where: {
        paidAt: { not: null },
        ...(shelterId && { campaign: { shelterId } }),
      },
      _sum: { amount: true },
    }),
  ]);

  const totalDonationsRaised = donationsAgg._sum.amount ?? 0;

  const stats = [
    { label: "Összes állat",       value: totalAnimals,       color: "text-gray-700"   },
    { label: "Örökbefogadható",    value: availableAnimals,   color: "text-green-700"  },
    { label: "Örökbefogadott",     value: adoptedAnimals,     color: "text-blue-700"   },
    { label: "Várakozó kérelem",   value: pendingApps,        color: "text-yellow-700" },
    { label: "Összes kérelem",     value: totalApps,          color: "text-brand-700"  },
    { label: "Aktív előfizetők",   value: activeSubsCount,    color: "text-purple-700" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Áttekintés</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium text-gray-500">Összegyűjtött adományok</p>
        <p className="mt-2 text-3xl font-bold text-emerald-700">
          {totalDonationsRaised.toLocaleString("hu-HU")} HUF
        </p>
      </div>
    </div>
  );
}
