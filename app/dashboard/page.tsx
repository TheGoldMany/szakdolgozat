import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import {
  PawPrint, ClipboardList, CalendarDays, Heart,
  TrendingUp, Building2, Users, DollarSign,
  Clock, ClipboardCheck, Syringe, PackageMinus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ApplicationStatus, SubscriptionStatus, CampaignStatus, FormStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { groupByMonth } from "@/lib/stats";
import { KpiCard } from "@/components/dashboard/stats/kpi-card";
import { TodoWidget, type TodoItem } from "@/components/dashboard/todo-widget";
import { AnimalsDonut } from "@/components/dashboard/stats/animals-donut";
import { ApplicationsBar } from "@/components/dashboard/stats/applications-bar";
import { AdoptionsLine } from "@/components/dashboard/stats/adoptions-line";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";

export const metadata: Metadata = { title: "Áttekintés" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard");

  const APP_STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
    INVITED:   { label: t("appStatusInvited"),   color: "bg-purple-100 text-purple-700" },
    PENDING:   { label: t("appStatusPending"),   color: "bg-yellow-100 text-yellow-700" },
    REVIEWING: { label: t("appStatusReviewing"), color: "bg-blue-100 text-blue-700" },
    APPROVED:  { label: t("appStatusApproved"),  color: "bg-green-100 text-green-700" },
    REJECTED:  { label: t("appStatusRejected"),  color: "bg-red-100 text-red-700" },
    WITHDRAWN: { label: t("appStatusWithdrawn"), color: "bg-gray-100 text-gray-500" },
  };

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // ─── SHELTER ADMIN ────────────────────────────────────────────────────────
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where:   { userId: session.user.id },
      include: { shelter: { select: { id: true, name: true } } },
    });
    const shelterId = admin?.shelterId;
    if (!shelterId) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          {t("noShelterAssigned")}
        </div>
      );
    }
    const adminShelters = admin?.shelter ? [{ id: admin.shelter.id, name: admin.shelter.name }] : [];

    const now      = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const in7days      = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
      todoNewApps,
      todoTodayAppts,
      todoDueVax,
      todoLowStockItems,
      todoDueFollowups,
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
      // ── Teendők widget adatai ──────────────────────────────────────────────
      prisma.adoptionApplication.count({
        where: { animal: { shelterId }, status: { in: [ApplicationStatus.PENDING, ApplicationStatus.REVIEWING] } },
      }),
      prisma.appointment.count({
        where: { shelterId, status: "CONFIRMED", proposedAt: { gte: startOfToday, lt: endOfToday } },
      }),
      prisma.healthRecord.count({
        where: { nextDueDate: { gte: startOfToday, lte: in7days }, animal: { shelterId } },
      }),
      prisma.inventoryItem.findMany({
        where:  { shelterId, minQuantity: { not: null } },
        select: { quantity: true, minQuantity: true },
      }),
      prisma.adoptionFollowUp.count({
        where: {
          application: { animal: { shelterId } },
          OR: [{ status: "OVERDUE" }, { status: "PENDING", scheduledAt: { lte: now } }],
        },
      }),
    ]);

    // Alacsony készlet: a Prisma nem hasonlít össze két oszlopot, ezért JS-ben szűrünk
    const lowStockCount = todoLowStockItems.filter(
      (i) => i.minQuantity != null && i.quantity <= i.minQuantity,
    ).length;

    const todoItems: TodoItem[] = [
      { key: "today-appts",   label: "Mai megerősített időpontok",       count: todoTodayAppts,        href: "/dashboard/appointments", icon: CalendarDays   },
      { key: "pending-appts", label: "Válaszra váró időpont-kérések",    count: pendingAppointments,   href: "/dashboard/appointments", icon: Clock          },
      { key: "new-apps",      label: "Feldolgozásra váró kérelmek",      count: todoNewApps,           href: "/dashboard/applications", icon: ClipboardList  },
      { key: "due-followups", label: "Esedékes utánkövetések",           count: todoDueFollowups,      href: "/dashboard/followups",    icon: ClipboardCheck },
      { key: "due-vax",       label: "Közelgő oltások / kezelések (7 nap)", count: todoDueVax,         href: "/dashboard/animals",      icon: Syringe        },
      { key: "low-stock",     label: "Alacsony készlet",                 count: lowStockCount,         href: "/dashboard/inventory",    icon: PackageMinus   },
    ];

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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{t("pageOverviewTitle")}</h1>
          <PageInfo page="overview" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("kpiTotalAnimals")}
            value={totalAnimals}
            icon={PawPrint}
            iconBg="bg-brand-50"
            iconColor="text-brand-500"
          />
          <KpiCard
            label={t("kpiPendingApps")}
            value={pendingApps}
            icon={ClipboardList}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-500"
            trend={{ value: pendingApps, label: t("kpiPendingAppointmentsLabel") }}
          />
          <KpiCard
            label={t("kpiAppointments")}
            value={pendingAppointments + confirmedAppointments}
            icon={CalendarDays}
            iconBg="bg-purple-50"
            iconColor="text-purple-500"
            trend={{ value: pendingAppointments, label: t("kpiPendingApptWait") }}
          />
          <KpiCard
            label={t("kpiAdoptionsThisMonth")}
            value={adoptedThisMonth}
            icon={Heart}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
            trend={{ value: adoptionTrend, label: t("kpiVsPrevMonth") }}
          />
        </div>

        {/* Teendők */}
        <TodoWidget items={todoItems} />

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Donut chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">{t("chartAnimalsByStatusTitle")}</h2>
            <p className="mb-4 text-xs text-gray-400">{t("chartAnimalsByStatusSubtitle")}</p>
            {animalStatusData.length > 0
              ? <AnimalsDonut data={animalStatusData} />
              : <p className="py-16 text-center text-sm text-gray-400">{t("chartNoData")}</p>
            }
          </div>

          {/* Applications bar chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">{t("chartApplicationsMonthlyTitle")}</h2>
            <p className="mb-4 text-xs text-gray-400">{t("chartLast6Months")}</p>
            <ApplicationsBar data={appsChartData} />
          </div>
        </div>

        {/* Adoptions trend + donations */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Adoptions line */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">{t("chartAdoptionsTrendTitle")}</h2>
            <p className="mb-4 text-xs text-gray-400">{t("chartLast6Months")}</p>
            <AdoptionsLine data={adoptionMonths.map(m => ({ month: m.month, adoptions: m.count }))} />
          </div>

          {/* Donations + subs */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{t("donationsCollectedLabel")}</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {(donationsAgg._sum.amount ?? 0).toLocaleString("hu-HU")}
                <span className="ml-1 text-sm font-medium text-gray-400">HUF</span>
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{t("activeSubscribersLabel")}</p>
              <p className="mt-2 text-2xl font-bold text-purple-700">{activeSubsCount}</p>
              <Link href="/dashboard/subscriptions"
                className="mt-2 block text-xs font-medium text-brand-500 hover:underline">
                {t("detailsLink")}
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
                  {t("awaitingConfirmationLabel")}
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
            <h2 className="text-sm font-semibold text-gray-700">{t("recentApplicationsTitle")}</h2>
            <Link href="/dashboard/applications" className="text-xs font-medium text-brand-500 hover:underline">
              {t("allApplicationsLink")}
            </Link>
          </div>
          {recentApps.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">{t("noApplications")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("tableAnimal")}</th>
                    <th className="hidden px-4 py-3 text-left sm:table-cell">{t("tableApplicant")}</th>
                    <th className="px-4 py-3 text-left">{t("tableStatus")}</th>
                    <th className="px-4 py-3 text-left">{t("tableDate")}</th>
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
                            {t("tableDetails")}
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

        {/* Analytics */}
        <AnalyticsSection role="SHELTER_ADMIN" shelters={adminShelters} />
      </div>
    );
  }

  // ─── SUPER ADMIN ──────────────────────────────────────────────────────────
  const now          = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const allShelters = await prisma.shelter.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const [
    totalUsers,
    totalShelters,
    totalAnimals,
    totalApplications,
    activeShelters,
    suspendedShelters,
    unverifiedShelters,
    unverifiedUsers,
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
    prisma.shelter.count({ where: { isActive: true } }),
    prisma.shelter.count({ where: { isActive: false } }),
    prisma.shelter.count({ where: { isVerified: false } }),
    prisma.user.count({ where: { emailVerified: null, password: { not: null } } }),
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
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{t("pageSuperAdminOverviewTitle")}</h1>
        <PageInfo page="overview" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={t("kpiUsers")}        value={totalUsers}        icon={Users}        iconBg="bg-gray-100"    iconColor="text-gray-600"
          trend={{ value: userTrend, label: t("kpiVsPrevMonth") }} />
        <KpiCard label={t("kpiShelters")}     value={totalShelters}     icon={Building2}    iconBg="bg-blue-50"     iconColor="text-blue-500" />
        <KpiCard label={t("kpiAnimals")}      value={totalAnimals}      icon={PawPrint}     iconBg="bg-brand-50"    iconColor="text-brand-500" />
        <KpiCard label={t("kpiApplications")} value={totalApplications} icon={ClipboardList} iconBg="bg-yellow-50" iconColor="text-yellow-500" />
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label={t("kpiMonthlyRevenue")} value={monthlyRevenue}       icon={TrendingUp}   iconBg="bg-purple-50" iconColor="text-purple-500" suffix="HUF" />
        <KpiCard label={t("kpiTotalDonations")} value={totalDonationsAmount} icon={DollarSign}   iconBg="bg-emerald-50" iconColor="text-emerald-500" suffix="HUF" />
      </div>

      {/* Platform health */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold text-gray-900">{t("platformHealthTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-green-50 p-3.5">
            <p className="text-2xl font-bold text-green-600">{activeShelters}</p>
            <p className="mt-0.5 text-xs font-medium text-green-700">{t("platformActiveShelters")}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3.5">
            <p className="text-2xl font-bold text-gray-500">{suspendedShelters}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-600">{t("platformSuspendedShelters")}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3.5">
            <p className="text-2xl font-bold text-amber-600">{unverifiedShelters}</p>
            <p className="mt-0.5 text-xs font-medium text-amber-700">{t("platformUnverifiedShelters")}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-3.5">
            <p className="text-2xl font-bold text-rose-600">{unverifiedUsers}</p>
            <p className="mt-0.5 text-xs font-medium text-rose-700">{t("platformUnverifiedEmails")}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <Link href="/dashboard/shelters" className="text-xs font-medium text-brand-600 hover:underline">
            {t("manageSheltersLink")}
          </Link>
          <Link href="/dashboard/users" className="text-xs font-medium text-brand-600 hover:underline">
            {t("manageUsersLink")}
          </Link>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/campaigns"
          className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm transition-colors hover:bg-orange-100">
          <p className="text-xs font-medium text-orange-600">{t("pendingCampaignApprovalsLabel")}</p>
          <p className="mt-2 text-3xl font-bold text-orange-700">{pendingCampaigns}</p>
          <p className="mt-1 text-sm font-medium text-orange-500">{t("approvalsLink")}</p>
        </Link>
        <Link href="/dashboard/campaigns"
          className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 shadow-sm transition-colors hover:bg-yellow-100">
          <p className="text-xs font-medium text-yellow-600">{t("pendingFormApprovalsLabel")}</p>
          <p className="mt-2 text-3xl font-bold text-yellow-700">{pendingForms}</p>
          <p className="mt-1 text-sm font-medium text-yellow-500">{t("approvalsLink")}</p>
        </Link>
      </div>

      {/* Applications chart */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">{t("chartApplicationsPlatformTitle")}</h2>
        <p className="mb-4 text-xs text-gray-400">{t("chartLast6Months")}</p>
        <ApplicationsBar data={appsChartData} />
      </div>

      {/* Recent applications table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">{t("recentApplicationsTitle")}</h2>
        </div>
        {recentApps.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">{t("noApplications")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">{t("tableAnimal")}</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">{t("tableShelter")}</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">{t("tableApplicant")}</th>
                  <th className="px-4 py-3 text-left">{t("tableStatus")}</th>
                  <th className="px-4 py-3 text-left">{t("tableDate")}</th>
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
          <h2 className="text-sm font-semibold text-gray-700">{t("recentDonationsTitle")}</h2>
        </div>
        {recentDonations.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400">{t("noDonations")}</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentDonations.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-700">{d.campaign?.title ?? t("unknownCampaign")}</span>
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

      {/* Analytics */}
      <AnalyticsSection role="SUPER_ADMIN" shelters={allShelters} />
    </div>
  );
}
