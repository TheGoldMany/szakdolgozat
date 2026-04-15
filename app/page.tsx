import Link from "next/link";
import { ArrowRight, PawPrint, Building2, Heart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ReportStatus } from "@prisma/client";
import { AnimalCard } from "@/components/animals/animal-card";
import { ReportCard } from "@/components/reports/report-card";
import { HomeSearch } from "@/components/home/home-search";

export const revalidate = 60;

export default async function HomePage() {
  const [availableCount, shelterCount, adoptedCount, latestAnimals, latestReports] =
    await Promise.all([
      prisma.animal.count({ where: { status: AnimalStatus.AVAILABLE } }),
      prisma.shelter.count({ where: { isActive: true } }),
      prisma.animal.count({ where: { status: AnimalStatus.ADOPTED } }),
      prisma.animal.findMany({
        where: { status: AnimalStatus.AVAILABLE },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          images:  { where: { isPrimary: true }, take: 1 },
          shelter: { select: { id: true, name: true, city: true } },
        },
      }),
      prisma.animalReport.findMany({
        where: { status: ReportStatus.ACTIVE },
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-gray-50">

      {/* Hero */}
      <section className="flex flex-col items-center px-4 pb-16 pt-20 text-center sm:pt-28">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
          <PawPrint className="h-3.5 w-3.5" />
          {availableCount} állat vár új gazdára
        </div>

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Találd meg új{" "}
          <span className="text-brand-500">legjobb barátodat</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
          Böngéssz örökbefogadható állatok között magyarországi menhelyekről,
          vagy jelents be elveszett és megtalált állatot.
        </p>

        <div className="mt-10 w-full max-w-2xl">
          <HomeSearch />
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/animals"
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Összes állat
          </Link>
          <Link
            href="/reports/new"
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Bejelentés leadása
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: availableCount.toLocaleString("hu-HU"), label: "Elérhető állat",  Icon: PawPrint },
            { value: shelterCount.toLocaleString("hu-HU"),   label: "Aktív menhely",   Icon: Building2 },
            { value: adoptedCount.toLocaleString("hu-HU"),   label: "Örökbefogadott",  Icon: Heart },
          ].map(({ value, label, Icon }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm sm:p-7">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-bold text-brand-600 sm:text-3xl">{value}</p>
              <p className="mt-1 text-xs text-gray-500 sm:text-sm">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest animals */}
      {latestAnimals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Legújabb állatok</h2>
              <p className="mt-1 text-sm text-gray-500">Frissen feltöltött örökbefogadható állatok</p>
            </div>
            <Link
              href="/animals"
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
            >
              Összes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestAnimals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        </section>
      )}

      {/* Latest reports */}
      {latestReports.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Friss bejelentések</h2>
              <p className="mt-1 text-sm text-gray-500">Elveszett, megtalált és kóbor állatok</p>
            </div>
            <Link
              href="/reports"
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
            >
              Összes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
