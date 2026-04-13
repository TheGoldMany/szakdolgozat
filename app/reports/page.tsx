import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReportCard } from "@/components/reports/report-card";
import { ReportType, ReportStatus, AnimalType } from "@prisma/client";

export const metadata: Metadata = { title: "Elveszett és megtalált állatok" };

interface PageProps {
  searchParams: { type?: string; status?: string };
}

export default async function ReportsPage({ searchParams }: PageProps) {
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
    { value: "",      label: "Összes" },
    { value: "LOST",  label: "🔍 Elveszett" },
    { value: "FOUND", label: "🏠 Megtalált" },
    { value: "STRAY", label: "🐾 Kóbor" },
  ];

  const statusButtons = [
    { value: "",         label: "Aktív" },
    { value: "RESOLVED", label: "Megoldva" },
    { value: "CLOSED",   label: "Lezárt" },
  ];

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams();
    if (params.type)   p.set("type",   params.type);
    if (params.status) p.set("status", params.status);
    return `/reports?${p.toString()}`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Fejléc */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Elveszett és megtalált állatok</h1>
            <p className="mt-2 text-gray-500">Segíts visszatalálni az elveszett kedvenceknek!</p>
          </div>
          <Link
            href="/reports/new"
            className="shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            + Bejelentés
          </Link>
        </div>

        {/* Szűrők */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {typeButtons.map((b) => (
              <Link
                key={b.value}
                href={buildUrl({ type: b.value, status: searchParams.status ?? "" })}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  (searchParams.type ?? "") === b.value
                    ? "bg-brand-500 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {b.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusButtons.map((b) => (
              <Link
                key={b.value}
                href={buildUrl({ type: searchParams.type ?? "", status: b.value })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  (searchParams.status ?? "") === b.value
                    ? "bg-gray-700 text-white"
                    : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Lista */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <span className="text-5xl">🔍</span>
            <p className="mt-4 text-lg font-medium text-gray-700">Nincs bejelentés</p>
            <p className="mt-1 text-sm text-gray-400">Légy az első, aki bejelent!</p>
            <Link href="/reports/new"
              className="mt-5 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600">
              Bejelentés indítása
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
