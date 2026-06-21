import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  ArrowRight, PawPrint, Building2, Heart, Search,
  ClipboardList, HandHeart, Dog, Cat, Rabbit, Bird,
  FileWarning, Zap, Shield, Users, MapPin,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ReportStatus } from "@prisma/client";
import { AnimalCard } from "@/components/animals/animal-card";
import { ReportCard } from "@/components/reports/report-card";
import { HomeSearch } from "@/components/home/home-search";
import { getTranslations } from "next-intl/server";

export const revalidate = 60;

export default async function HomePage() {
  const t        = await getTranslations("home");
  const tAnimals = await getTranslations("animals");

  const [availableCount, shelterCount, adoptedCount, latestAnimals, latestReports, heroPhotos, featuredShelters] =
    await Promise.all([
      prisma.animal.count({ where: { status: AnimalStatus.AVAILABLE } }),
      prisma.shelter.count({ where: { isActive: true } }),
      prisma.animal.count({ where: { status: AnimalStatus.ADOPTED } }),
      prisma.animal.findMany({
        where: { status: AnimalStatus.AVAILABLE },
        orderBy: { createdAt: "desc" },
        take: 4,
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
        take: 5,
        select: { url: true },
      }),
      prisma.shelter.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 8,
        select: { id: true, name: true, city: true, slug: true, logoUrl: true },
      }),
    ]);

  const photos = heroPhotos.map((p) => p.url).filter(Boolean);

  const TYPE_FILTERS = [
    { href: "/animals?type=DOG",    Icon: Dog,      label: tAnimals("dog")    },
    { href: "/animals?type=CAT",    Icon: Cat,      label: tAnimals("cat")    },
    { href: "/animals?type=RABBIT", Icon: Rabbit,   label: tAnimals("rabbit") },
    { href: "/animals?type=BIRD",   Icon: Bird,     label: tAnimals("bird")   },
    { href: "/animals?type=OTHER",  Icon: PawPrint, label: tAnimals("other")  },
  ];

  const WHY_FEATURES = [
    { Icon: Zap,           title: t("why1Title"), desc: t("why1Desc") },
    { Icon: ClipboardList, title: t("why2Title"), desc: t("why2Desc") },
    { Icon: Shield,        title: t("why3Title"), desc: t("why3Desc") },
    { Icon: Users,         title: t("why4Title"), desc: t("why4Desc") },
  ];

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-orange-50/30">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-orange-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">

            {/* Left: text */}
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                {t("badge", { count: availableCount })}
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                {t("heroTitle")}{" "}
                <span className="relative whitespace-nowrap text-brand-500">
                  {t("heroTitleHighlight")}
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 9.5C50 3.5 150 1 298 9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-brand-300" />
                  </svg>
                </span>
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-gray-500">
                {t("heroDesc")}
              </p>

              <div className="mt-8 w-full">
                <HomeSearch />
              </div>

              {/* Type filter pills */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href="/animals"
                  className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600">
                  <PawPrint className="h-3.5 w-3.5" /> {t("allAnimals")}
                </Link>
                {TYPE_FILTERS.map(({ href, Icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-600">
                    <Icon className="h-3.5 w-3.5 shrink-0" /> {label}
                  </Link>
                ))}
                <span className="mx-1 h-4 w-px bg-gray-300" />
                <Link href="/reports/new"
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white/60 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600">
                  <FileWarning className="h-3.5 w-3.5 shrink-0" /> {t("submitReport")}
                </Link>
              </div>
            </div>

            {/* Right: photo grid */}
            <div className="hidden lg:grid grid-cols-2 grid-rows-2 gap-3 h-[420px]">
              {photos[0] && (
                <div className="row-span-2 overflow-hidden rounded-3xl shadow-xl">
                  <Image src={photos[0]} alt="Állat" fill className="object-cover" sizes="280px" />
                </div>
              )}
              {photos[1] && (
                <div className="overflow-hidden rounded-3xl shadow-lg">
                  <Image src={photos[1]} alt="Állat" fill className="object-cover" sizes="196px" />
                </div>
              )}
              {photos[2] && (
                <div className="overflow-hidden rounded-3xl shadow-lg">
                  <Image src={photos[2]} alt="Állat" fill className="object-cover" sizes="196px" />
                </div>
              )}
              {photos.length === 0 && (
                <div className="col-span-2 row-span-2 flex items-center justify-center rounded-3xl bg-brand-50">
                  <PawPrint className="h-32 w-32 text-brand-200" />
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
            {[
              { value: availableCount, label: t("statsAvailable"), Icon: PawPrint,  color: "text-brand-500"  },
              { value: shelterCount,   label: t("statsShelters"),  Icon: Building2, color: "text-orange-500" },
              { value: adoptedCount,   label: t("statsAdopted"),   Icon: Heart,     color: "text-emerald-500" },
            ].map(({ value, label, Icon, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-4 py-2">
                <Icon className={`h-5 w-5 ${color}`} />
                <p className="text-2xl font-extrabold text-gray-900 sm:text-3xl tabular-nums">
                  {value.toLocaleString("hu-HU")}
                </p>
                <p className="text-xs text-gray-400 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest animals ───────────────────────────────────────────── */}
      {latestAnimals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-brand-500">{t("latestAnimalsDesc")}</p>
              <h2 className="text-3xl font-extrabold text-gray-900">{t("latestAnimals")}</h2>
            </div>
            <Link href="/animals" className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              {t("all")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestAnimals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
          <div className="mt-6 flex justify-center sm:hidden">
            <Link href="/animals" className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              {t("all")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Why us ───────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">{t("whyTitle")}</h2>
            <p className="mt-2 text-gray-500">{t("whySubtitle")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_FEATURES.map(({ Icon, title, desc }, i) => (
              <div key={i} className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 transition-colors group-hover:bg-brand-100">
                  <Icon className="h-6 w-6 text-brand-500" />
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="mb-12 text-center text-3xl font-extrabold text-gray-900">{t("howTitle")}</h2>
          <div className="relative grid grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Connector line (desktop) */}
            <div className="pointer-events-none absolute top-7 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 sm:block" />

            {[
              { Icon: Search,        step: "1", title: t("step1Title"), desc: t("step1Desc") },
              { Icon: ClipboardList, step: "2", title: t("step2Title"), desc: t("step2Desc") },
              { Icon: HandHeart,     step: "3", title: t("step3Title"), desc: t("step3Desc") },
            ].map(({ Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-200">
                  <Icon className="h-6 w-6 text-white" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-brand-600 shadow">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured shelters ─────────────────────────────────────────── */}
      {featuredShelters.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">{t("sheltersTitle")}</h2>
                <p className="mt-1 text-sm text-gray-500">{t("sheltersDesc")}</p>
              </div>
              <Link href="/shelters" className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                {t("all")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {featuredShelters.map((s) => (
                <Link key={s.id} href={`/shelters/${s.slug}`}
                  className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 transition-colors group-hover:bg-brand-100">
                    {s.logoUrl
                      ? <Image src={s.logoUrl} alt={s.name} width={32} height={32} className="rounded-lg object-contain" />
                      : <Building2 className="h-5 w-5 text-brand-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 group-hover:text-brand-600">{s.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                      <MapPin className="h-3 w-3 shrink-0" />{s.city}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest reports ───────────────────────────────────────────── */}
      {latestReports.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-orange-500">{t("latestReportsDesc")}</p>
                <h2 className="text-3xl font-extrabold text-gray-900">{t("latestReports")}</h2>
              </div>
              <Link href="/reports" className="hidden sm:flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
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

      {/* ── Dual CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-600 py-16 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-400/30 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <PawPrint className="mx-auto mb-4 h-12 w-12 text-brand-300" />
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t("ctaTitle")}</h2>
          <p className="mt-3 text-brand-200">{t("ctaDesc")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/animals"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-brand-700 shadow-lg transition-colors hover:bg-brand-50 sm:w-auto">
              <PawPrint className="h-4 w-4" />
              {t("ctaAdopt")}
            </Link>
            <Link href="/donate"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/10 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:w-auto">
              <Heart className="h-4 w-4" />
              {t("ctaDonate")}
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
