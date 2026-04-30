import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ArrowRight, PawPrint, Building2, Heart, Search, ClipboardList, HandHeart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ReportStatus } from "@prisma/client";
import { AnimalCard } from "@/components/animals/animal-card";
import { ReportCard } from "@/components/reports/report-card";
import { HomeSearch } from "@/components/home/home-search";
import { getTranslations } from "next-intl/server";

export const revalidate = 60;

export default async function HomePage() {
  const t = await getTranslations("home");
  const tNav = await getTranslations("nav");

  const [availableCount, shelterCount, adoptedCount, latestAnimals, latestReports, heroPhotos] =
    await Promise.all([
      prisma.animal.count({ where: { status: AnimalStatus.AVAILABLE } }),
      prisma.shelter.count({ where: { isActive: true } }),
      prisma.animal.count({ where: { status: AnimalStatus.ADOPTED } }),
      prisma.animal.findMany({
        where: { status: AnimalStatus.AVAILABLE },
        orderBy: { createdAt: "desc" },
        take: 3,
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
      prisma.animalImage.findMany({
        where: { isPrimary: true, animal: { status: AnimalStatus.AVAILABLE } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { url: true },
      }),
    ]);

  const photos = heroPhotos.map((p) => p.url).filter(Boolean);

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                <PawPrint className="h-3.5 w-3.5" />
                {t("badge", { count: availableCount })}
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {t("heroTitle")}{" "}
                <span className="text-brand-500">{t("heroTitleHighlight")}</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-gray-500">
                {t("heroDesc")}
              </p>

              <div className="mt-6 w-full">
                <HomeSearch />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/animals"
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
                >
                  {t("allAnimals")}
                </Link>
                <Link
                  href="/reports/new"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t("submitReport")}
                </Link>
              </div>
            </div>

            {/* Photo collage */}
            <div className="relative hidden h-80 lg:block">
              {photos[0] && (
                <div className="absolute right-0 top-0 h-56 w-52 overflow-hidden rounded-2xl shadow-xl rotate-2">
                  <Image src={photos[0]} alt="Állat" fill className="object-cover" sizes="208px" />
                </div>
              )}
              {photos[1] && (
                <div className="absolute left-4 top-10 h-52 w-48 overflow-hidden rounded-2xl shadow-lg -rotate-2">
                  <Image src={photos[1]} alt="Állat" fill className="object-cover" sizes="192px" />
                </div>
              )}
              {photos[2] && (
                <div className="absolute bottom-0 right-16 h-48 w-44 overflow-hidden rounded-2xl shadow-md rotate-1">
                  <Image src={photos[2]} alt="Állat" fill className="object-cover" sizes="176px" />
                </div>
              )}
              {photos.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <PawPrint className="h-40 w-40 text-brand-100" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Latest animals ───────────────────────────────── */}
      {latestAnimals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t("latestAnimals")}</h2>
              <p className="mt-1 text-sm text-gray-500">{t("latestAnimalsDesc")}</p>
            </div>
            <Link href="/animals" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
              {t("all")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latestAnimals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        </section>
      )}

      {/* ── Stats band ───────────────────────────────────── */}
      <section className="bg-brand-600 py-8 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: availableCount, label: t("statsAvailable"), Icon: PawPrint  },
              { value: shelterCount,   label: t("statsShelters"),  Icon: Building2 },
              { value: adoptedCount,   label: t("statsAdopted"),   Icon: Heart     },
            ].map(({ value, label, Icon }) => (
              <div key={label}>
                <Icon className="mx-auto mb-1 h-5 w-5 text-brand-200" />
                <p className="text-2xl font-bold sm:text-3xl">{value.toLocaleString("hu-HU")}</p>
                <p className="mt-0.5 text-xs text-brand-200 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="bg-gray-50 py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">{t("howTitle")}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { Icon: Search,      title: t("step1Title"), desc: t("step1Desc"), step: "1" },
              { Icon: ClipboardList, title: t("step2Title"), desc: t("step2Desc"), step: "2" },
              { Icon: HandHeart,   title: t("step3Title"), desc: t("step3Desc"), step: "3" },
            ].map(({ Icon, title, desc, step }) => (
              <div key={step} className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <span className="absolute right-4 top-4 text-3xl font-black text-gray-100">{step}</span>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-500" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest reports ───────────────────────────────── */}
      {latestReports.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("latestReports")}</h2>
                <p className="mt-1 text-sm text-gray-500">{t("latestReportsDesc")}</p>
              </div>
              <Link href="/reports" className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
                {t("all")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {latestReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="bg-brand-600 py-14 text-center text-white">
        <div className="mx-auto max-w-xl px-4">
          <PawPrint className="mx-auto mb-4 h-10 w-10 text-brand-300" />
          <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-2 text-sm text-brand-200">{t("ctaDesc")}</p>
          <Link
            href="/reports/new"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow transition-colors hover:bg-brand-50"
          >
            {t("submitReport")}
          </Link>
        </div>
      </section>

    </main>
  );
}
