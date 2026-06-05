import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import {
  PawPrint, ClipboardList, CalendarDays, Heart,
  TrendingUp, Building2, Users, DollarSign,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ApplicationStatus, SubscriptionStatus, CampaignStatus, FormStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { groupByMonth } from "@/lib/stats";
import { KpiCard } from "@/components/dashboard/stats/kpi-card";
import { AnimalsDonut } from "@/components/dashboard/stats/animals-donut";
import { ApplicationsBar } from "@/components/dashboard/stats/applications-bar";
import { AdoptionsLine } from "@/components/dashboard/stats/adoptions-line";

export const metadata: Metadata = { title: "Áttekintés" };
export const dynamic = "force-dynamic";

const APP_STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
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

  // ─── SHELTER ADMIN ────────────────────────────────────────────────────────
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id } });
    const shelterId = admin?.shelterId;
    if (!shelterId) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          Még nincs menhelyhez rendelve a fiókod.
        </div>
      );
    }

    const now      = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [
      animalsByStatus,
      adoptedThisMonth,
      adoptedLastMonth,
      allApps,
      pendingApps,
      pendingAppointments,
      confirmedAppointments,
      activeSubsCount,
      donationsAgg,
      recentApps,
      recentAdoptions,
    ] = await Promise.all([
      prisma.animal.groupBy({
        by: ["status"],
        where: { shelterId },
        _count: { id: true },
      }),
      prisma.animal.count({
        where: { shelterId, status: AnimalStatus.ADOPTED, adoptedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
      prisma.animal.count({
        where: { shelterId, status: AnimalStatus.ADOPTED, adoptedAt: { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lt: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
      prisma.adoptionApplication.findMany({
        where:   { animal: { shelterId }, createdAt: { gte: sixMonthsAgo } },
        select:  { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.adoptionApplication.count({
        where: { animal: { shelterId }, status: ApplicationStatus.PENDING },
      }),
      prisma.appointment.count({ where: { shelterId, status: "PENDING" } }),
      prisma.appointment.count({ where: { shelterId, status: "CONFIRMED", proposedAt: { gte: now } } }),
      prisma.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE, tier: { shelterId } },
      }),
      prisma.donation.aggregate({
        where:  { paidAt: { not: null }, campaign: { shelterId } },
        _sum:   { amount: true },
      }),
      prisma.adoptionApplication.findMany({
        where:   { animal: { shelterId } },
        orderBy: { createdAt: "desc" },
        take:    6,
        include: {
          user:   { select: { name: true, email: true } },
          animal: { select: { name: true, slug: true } },
        },
      }),
      prisma.animal.findMany({
        where:   { shelterId, status: AnimalStatus.ADOPTED, adoptedAt: { gte: sixMonthsAgo } },
        select:  { adoptedAt: true },
      }),
    ]);

    // ── Build chart data ──────────────────────────────────────────────────
    const animalStatusData = animalsByStatus.map(a => ({
      status: a.status,
      count:  a._count.id,
    }));

    const adoptionMonths = groupByMonth(
      recentAdoptions.filter(a => a.adoptedAt).map(a => a.adoptedAt!),
      6
    );

    const appsByMonth = groupByMonth(allApps.map(a => a.createdAt), 6);
    const approvedByMonth = groupByMonth(allApps.filter(a => a.status === "APPROVED").map(a => a.createdAt), 6);
    const rejectedByMonth = groupByMonth(allApps.filter(a => a.status === "REJECTED").map(a => a.createdAt), 6);

    const appsChartData = appsByMonth.map((m, i) => ({
      month:    m.month,
      total:    m.count,
      approved: approvedByMonth[i].count,
      rejected: rejectedByMonth[i].count,
    }));

    const adoptionTrend = adoptedThisMonth - adoptedLastMonth;
    const totalAnimals  = animalsByStatus.reduce((s, a) => s + a._count.id, 0);

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Áttekintés</h1>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Összes állat"
            value={totalAnimals}
            icon={PawPrint}
            iconBg="bg-brand-50"
            iconColor="text-brand-500"
          />
          <KpiCard
            label="Várakozó kérelem"
            value={pendingApps}
            icon={ClipboardList}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-500"
            trend={{ value: pendingApps, label: "jóváhagyásra vár" }}
          />
          <KpiCard
            label="Időpontok"
            value={pendingAppointments + confirmedAppointments}
            icon={CalendarDays}
            iconBg="bg-purple-50"
            iconColor="text-purple-500"
            trend={{ value: pendingAppointments, label: "visszaigazolásra vár" }}
          />
          <KpiCard
            label="Örökbefogadás (hónap)"
            value={adoptedThisMonth}
            icon={Heart}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            trend={{ value: adoptionTrend, label: "vs. előző hónap" }}
          />
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Donut chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Állatok státusz szerint</h2>
            <p className="mb-4 text-xs text-gray-400">Jelenlegi megoszlás</p>
            {animalStatusData.length > 0
              ? <AnimalsDonut data={animalStatusData} />
              : <p className="py-16 text-center text-sm text-gray-400">Nincs adat</p>
            }
          </div>

          {/* Applications bar chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Kérelmek havi bontásban</h2>
            <p className="mb-4 text-xs text-gray-400">Elmúlt 6 hónap</p>
            <ApplicationsBar data={appsChartData} />
          </div>
        </div>

        {/* Adoptions trend + donations */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Adoptions line */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">Örökbefogadások trendje</h2>
            <p className="mb-4 text-xs text-gray-400">Elmúlt 6 hónap</p>
            <AdoptionsLine data={adoptionMonths.map(m => ({ month: m.month, adoptions: m.count }))} />
          </div>

          {/* Donations + subs */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Összegyűjtött adományok</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {(donationsAgg._sum.amount ?? 0).toLocaleString("hu-HU")}
                <span className="ml-1 text-sm font-medium text-gray-400">HUF</span>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Aktív előfizetők</p>
              <p className="mt-2 text-2xl font-bold text-purple-700">{activeSubsCount}</p>
              <Link href="/dashboard/subscriptions"
                className="mt-2 block text-xs font-medium text-brand-500 hover:underline">
                Részletek →
              </Link>
            </div>
            <Link href="/dashboard/appointments"
              className={cn(
                "flex items-center justify-between rounded-2xl border p-5 shadow-sm transition-colors",
                pendingAppointments > 0
                  ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                  : "border-gray-100 bg-white hover:bg-gray-50"
              )}>
              <div>
                <p className={`text-xs font-medium ${pendingAppointments > 0 ? "text-amber-600" : "text-gray-500"}`}>
                  Visszaigazolásra vár
                </p>
                <p className={`mt-1 text-2xl font-bold ${pendingAppointments > 0 ? "text-amber-700" : "text-gray-700"}`}>
                  {pendingAppointments}
                </p>
              </div>
              <CalendarDays className={`h-8 w-8 ${pendingAppointments > 0 ? "text-amber-400" : "text-gray-300"}`} />
            </Link>
          </div>
        </div>

        {/* Recent applications */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Legutóbbi kérelmek</h2>
            <Link href="/dashboard/applications" className="text-xs font-medium text-brand-500 hover:underline">
              Összes →
            </Link>
          </div>
          {recentApps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">Nincs kérelem.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Állat</th>
                    <th className="hidden px-4 py-3 text-left sm:table-cell">Kérelmező</th>
                    <th className="px-4 py-3 text-left">Státusz</th>
                    <th className="px-4 py-3 text-left">Dátum</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentApps.map((app) => {
                    const st = APP_STATUS_LABELS[app.status];
                    return (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{app.animal.name}</td>
                        <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell">
                          {app.user.name ?? app.user.email}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.color)}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400">
                          {new Date(app.createdAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link href={`/dashboard/applications/${app.id}`}
                            className="text-brand-500 hover:underline">
                            Részletek
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── SUPER ADMIN ──────────────────────────────────────────────────────────
  const now          = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

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
    newUsersThisMonth,
    newUsersLastMonth,
    allRecentApps,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.shelter.count(),
    prisma.animal.count(),
    prisma.adoptionApplication.count(),
    prisma.subscription.findMany({
      where:   { status: SubscriptionStatus.ACTIVE },
      include: { tier: { select: { amount: true } } },
    }),
    prisma.donation.aggregate({
      where: { paidAt: { not: null } },
      _count: { id: true },
      _sum:   { amount: true },
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
      where:   { paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take:    5,
      include: { campaign: { select: { title: true } } },
    }),
    prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
    prisma.adoptionApplication.findMany({
      where:   { createdAt: { gte: sixMonthsAgo } },
      select:  { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const monthlyRevenue = activeSubs.reduce((sum, s) => sum + s.tier.amount, 0);
  const totalDonationsAmount = paidDonationsAgg._sum.amount ?? 0;
  const userTrend = newUsersThisMonth - newUsersLastMonth;

  const appsByMonth = groupByMonth(allRecentApps.map(a => a.createdAt), 6);
  const approvedByMonth = groupByMonth(allRecentApps.filter(a => a.status === "APPROVED").map(a => a.createdAt), 6);
  const rejectedByMonth = groupByMonth(allRecentApps.filter(a => a.status === "REJECTED").map(a => a.createdAt), 6);
  const appsChartData = appsByMonth.map((m, i) => ({
    month: m.month, total: m.count,
    approved: approvedByMonth[i].count,
    rejected: rejectedByMonth[i].count,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Főadmin áttekintés</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Felhasználók"  value={totalUsers}        icon={Users}        iconBg="bg-gray-100"    iconColor="text-gray-600"
          trend={{ value: userTrend, label: "vs. előző hónap" }} />
        <KpiCard label="Menhelyek"     value={totalShelters}     icon={Building2}    iconBg="bg-blue-50"     iconColor="text-blue-500" />
        <KpiCard label="Állatok"       value={totalAnimals}      icon={PawPrint}     iconBg="bg-brand-50"    iconColor="text-brand-500" />
        <KpiCard label="Kérelmek"      value={totalApplications} icon={ClipboardList} iconBg="bg-yellow-50" iconColor="text-yellow-500" />
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Havi előfizetési bevétel" value={monthlyRevenue}       icon={TrendingUp}   iconBg="bg-purple-50" iconColor="text-purple-500" suffix="HUF" />
        <KpiCard label="Összes adomány"           value={totalDonationsAmount} icon={DollarSign}   iconBg="bg-emerald-50" iconColor="text-emerald-500" suffix="HUF" />
      </div>

      {/* Pending approvals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/campaigns"
          className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm transition-colors hover:bg-orange-100">
          <p className="text-xs font-medium text-orange-600">Kampány jóváhagyások</p>
          <p className="mt-2 text-3xl font-bold text-orange-700">{pendingCampaigns}</p>
          <p className="mt-1 text-sm font-medium text-orange-500">Jóváhagyások →</p>
        </Link>
        <Link href="/dashboard/campaigns"
          className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 shadow-sm transition-colors hover:bg-yellow-100">
          <p className="text-xs font-medium text-yellow-600">Kérvény sablon jóváhagyások</p>
          <p className="mt-2 text-3xl font-bold text-yellow-700">{pendingForms}</p>
          <p className="mt-1 text-sm font-medium text-yellow-500">Jóváhagyások →</p>
        </Link>
      </div>

      {/* Applications chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Kérelmek platform-szerte</h2>
        <p className="mb-4 text-xs text-gray-400">Elmúlt 6 hónap</p>
        <ApplicationsBar data={appsChartData} />
      </div>

      {/* Recent applications table */}
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
                  const st = APP_STATUS_LABELS[app.status];
                  return (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{app.animal.name}</td>
                      <td className="hidden px-4 py-2.5 text-gray-500 sm:table-cell">{app.animal.shelter.name}</td>
                      <td className="hidden px-4 py-2.5 text-gray-500 md:table-cell">{app.user.name ?? app.user.email}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", st.color)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {new Date(app.createdAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
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
                <span className="text-sm text-gray-700">{d.campaign?.title ?? "Ismeretlen kampány"}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-emerald-600">{d.amount.toLocaleString("hu-HU")} HUF</span>
                  <span className="text-xs text-gray-400">
                    {d.paidAt ? new Date(d.paidAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }) : "–"}
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
