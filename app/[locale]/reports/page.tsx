import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReportCard } from "@/components/reports/report-card";
import { ReportType, ReportStatus } from "@prisma/client";
import { getTranslations, getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

interface PageProps {
  searchParams: { type?: string; status?: string };
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const t      = await getTranslations("reports");
  const locale = await getLocale();
  const basePath = locale === routing.defaultLocale ? "/reports" : `/${locale}/reports`;

  const typeFilter   = searchParams.type   as ReportType   | undefined;
  const statusFilter = searchParams.status as ReportStatus | undefined;

  const reports = await prisma.animalReport.findMany({
    where: {
      ...(typeFilter   && { type:   typeFilter }),
      ...(statusFilter ? { status: statusFilter } : { status: "ACTIVE" }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const typeButtons = [
    { value: "",      label: t("all") },
    { value: "LOST",  label: t("lost") },
    { value: "FOUND", label: t("found") },
    { value: "STRAY", label: t("stray") },
  ];

  const statusButtons = [
    { value: "",         label: t("active") },
    { value: "RESOLVED", label: t("resolved") },
    { value: "CLOSED",   label: t("closed") },
  ];

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams();
    if (params.type)   p.set("type",   params.type);
    if (params.status) p.set("status", params.status);
    return `${basePath}?${p.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
              <p className="mt-1 text-sm text-gray-500">{t("desc")}</p>
            </div>
            <Link
              href="/reports/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 sm:shrink-0"
            >
              + {t("newReport")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            {/* Type filters */}
            <div className="flex flex-wrap gap-2">
              {typeButtons.map((b) => (
                <Link
                  key={b.value}
                  href={buildUrl({ type: b.value, status: searchParams.status ?? "" })}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    (searchParams.type ?? "") === b.value
                      ? "bg-brand-500 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {b.label}
                </Link>
              ))}
            </div>
            {/* Status filters */}
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
              {statusButtons.map((b) => (
                <Link
                  key={b.value}
                  href={buildUrl({ type: searchParams.type ?? "", status: b.value })}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    (searchParams.status ?? "") === b.value
                      ? "bg-gray-800 text-white"
                      : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {b.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Search className="h-7 w-7 text-gray-400" />
            </div>
            <p className="mt-4 text-lg font-medium text-gray-700">{t("noReports")}</p>
            <p className="mt-1 text-sm text-gray-400">{t("noReportsDesc")}</p>
            <Link href="/reports/new"
              className="mt-5 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
              {t("newReport")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
