import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { Map as MapIcon, Plus, Search } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportCard } from "@/components/reports/report-card";
import { ReportType, ReportStatus, Prisma } from "@prisma/client";
import { getTranslations, getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";
import { REPORT_TYPE_STYLE } from "@/lib/report-style";

/**
 * A listaoldal a kulcsszavas belépési pont: a cím eddig csak a menüpont
 * szövege volt (pl. „Állatok"), leírás nélkül. A keresőtalálatban a leírás
 * adja a kattintás okát, és kanonikus cím + hreflang nélkül a négy nyelvi
 * változat duplikátumnak látszott.
 */
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("seo");
  return pageMetadata({
    locale:      params.locale,
    path:        "/reports",
    title:       t("reportsTitle"),
    description: t("reportsDescription"),
  });
}

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}

const PAGE_SIZE = 24;
const TYPES:    ReportType[]   = ["LOST", "FOUND", "STRAY"];
const STATUSES: ReportStatus[] = ["ACTIVE", "RESOLVED", "CLOSED"];

export default async function ReportsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const [t, ta, locale, session] = await Promise.all([
    getTranslations("reports"),
    getTranslations("animals"),
    getLocale(),
    getServerSession(authOptions),
  ]);
  const basePath = locale === routing.defaultLocale ? "/reports" : `/${locale}/reports`;

  // Csak ismert értéket engedünk a lekérdezésbe; egy elgépelt URL ne dobjon hibát.
  const typeFilter   = TYPES.includes(searchParams.type as ReportType) ? (searchParams.type as ReportType) : undefined;
  const statusFilter = STATUSES.includes(searchParams.status as ReportStatus) ? (searchParams.status as ReportStatus) : "ACTIVE";
  const page         = Math.max(1, Math.floor(Number(searchParams.page ?? 1)) || 1);

  const where: Prisma.AnimalReportWhereInput = {
    status: statusFilter,
    ...(typeFilter && { type: typeFilter }),
  };

  const [reports, total, byType, myReports] = await Promise.all([
    prisma.animalReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
    }),
    prisma.animalReport.count({ where }),
    // A típusfülek mellé írt darabszám: az adott státuszon belül.
    prisma.animalReport.groupBy({ by: ["type"], where: { status: statusFilter }, _count: true }),
    session?.user?.id
      ? prisma.animalReport.findMany({
          where:   { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take:    8,
        })
      : Promise.resolve([]),
  ]);

  const countOf    = (type?: ReportType) =>
    byType.filter((g) => !type || g.type === type).reduce((s, g) => s + g._count, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: { type?: string; status?: string; page?: number }) {
    const p = new URLSearchParams();
    const type   = next.type   ?? typeFilter ?? "";
    const status = next.status ?? (statusFilter === "ACTIVE" ? "" : statusFilter);
    if (type)   p.set("type", type);
    if (status) p.set("status", status);
    if (next.page && next.page > 1) p.set("page", String(next.page));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const typeTabs = [
    { value: "", label: t("all"), count: countOf() },
    ...TYPES.map((v) => ({ value: v, label: { LOST: t("lost"), FOUND: t("found"), STRAY: t("stray") }[v], count: countOf(v) })),
  ];
  const statusTabs = [
    { value: "",         label: t("active") },
    { value: "RESOLVED", label: t("resolved") },
    { value: "CLOSED",   label: t("closed") },
  ];
  const activeStatus = statusFilter === "ACTIVE" ? "" : statusFilter;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Fejléc */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
              <p className="mt-2 text-gray-600">{t("listIntro")}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/map"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-graphite transition-colors hover:border-brand-600 hover:text-brand-700"
              >
                <MapIcon className="h-4 w-4" />
                {t("viewOnMap")}
              </Link>
              <Link
                href="/reports/new"
                data-tour="report-new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
              >
                <Plus className="h-4 w-4" />
                {t("newReport")}
              </Link>
            </div>
          </div>

          {/* Szűrők: típus fülek darabszámmal, jobbra az állapot */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label={t("formTypeLabel")}>
              {typeTabs.map((tab) => {
                const active = (typeFilter ?? "") === tab.value;
                const dot    = tab.value ? REPORT_TYPE_STYLE[tab.value as ReportType].dot : null;
                return (
                  <Link
                    key={tab.value}
                    href={href({ type: tab.value, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-graphite text-white" : "text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
                    {tab.label}
                    <span className={cn("tabular-nums text-xs", active ? "text-white/70" : "text-gray-400")}>
                      {tab.count}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="inline-flex self-start rounded-lg bg-gray-100 p-1 lg:self-auto">
              {statusTabs.map((tab) => {
                const active = activeStatus === tab.value;
                return (
                  <Link
                    key={tab.value}
                    href={href({ status: tab.value, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                      active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        {/* Saját bejelentések: kompakt sor, hogy ne tolja le a listát */}
        {myReports.length > 0 && (
          <section className="mb-10">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">{t("myReports")}</h2>
              <span className="text-sm text-gray-500">{t("myReportsDesc")}</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {myReports.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/reports/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors hover:border-gray-300"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900">
                        {r.name ?? r.breed ?? ta(r.animalType.toLowerCase() as "dog")}
                      </span>
                      <span className="block truncate text-xs text-gray-500">{r.city}</span>
                    </span>
                    <span className={cn(
                      "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
                      r.status === "ACTIVE" ? REPORT_TYPE_STYLE[r.type].soft : "bg-gray-100 text-gray-600",
                    )}>
                      {r.status === "ACTIVE"
                        ? { LOST: t("lost"), FOUND: t("found"), STRAY: t("stray") }[r.type]
                        : { ACTIVE: t("active"), RESOLVED: t("resolved"), CLOSED: t("closed") }[r.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
            <Search className="h-10 w-10 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-800">{t("noReports")}</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">{t("noReportsDesc")}</p>
            <Link
              href="/reports/new"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              <Plus className="h-4 w-4" />
              {t("newReport")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {reports.map((r, i) => (
                <li key={r.id}>
                  <ReportCard report={r} priority={i < 4} />
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-3 text-sm" aria-label={ta("page", { current: page, total: totalPages })}>
                {page > 1 ? (
                  <Link href={href({ page: page - 1 })} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:border-gray-400">
                    {ta("prevPage")}
                  </Link>
                ) : <span className="rounded-lg px-4 py-2 text-gray-300">{ta("prevPage")}</span>}
                <span className="tabular-nums text-gray-500">{ta("page", { current: page, total: totalPages })}</span>
                {page < totalPages ? (
                  <Link href={href({ page: page + 1 })} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:border-gray-400">
                    {ta("nextPage")}
                  </Link>
                ) : <span className="rounded-lg px-4 py-2 text-gray-300">{ta("nextPage")}</span>}
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
