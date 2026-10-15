import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResolveButton } from "@/components/reports/resolve-button";
import { ReportMatches, type MatchView } from "@/components/reports/report-matches";
import { StaticMap } from "@/components/ui/static-map";
import { ShareButton } from "@/components/ui/share-button";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus, AnimalType } from "@prisma/client";
import { getTranslations, getLocale } from "next-intl/server";
import { REPORT_TYPE_STYLE, SPECIES_ICON, relativeTime } from "@/lib/report-style";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const [r, t] = await Promise.all([
    prisma.animalReport.findUnique({ where: { id: params.id }, select: { type: true, city: true } }),
    getTranslations("reports"),
  ]);
  if (!r) return { title: t("notFound") };
  const typeLabel = { LOST: t("lost"), FOUND: t("found"), STRAY: t("stray") }[r.type];
  return {
    title: `${typeLabel} – ${r.city}`,
    // A bejelentés-oldal egy magánszemély nevét, telefonszámát és e-mail-
    // címét tartalmazza. Keresőben ennek nincs helye: a gyűjtőoldal
    // (`/reports`) indexelődik, a személyes adatot hordozó egyedi oldal nem.
    robots: { index: false, follow: true },
  };
}

export default async function ReportDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const [report, session, t, ta, locale] = await Promise.all([
    prisma.animalReport.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] } },
    }),
    getServerSession(authOptions),
    getTranslations("reports"),
    getTranslations("animals"),
    getLocale(),
  ]);

  if (!report) notFound();

  const isOwner = !!session?.user?.id && report.userId === session.user.id;
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SHELTER_ADMIN";
  const isOwnerOrAdmin = isOwner || isAdmin;

  /**
   * Kinek jár a bejelentő elérhetősége.
   *
   * A név, a telefon és az e-mail azért nyilvános, hogy aki megtalálta az
   * állatot, elérje a gazdát; ez AKTÍV ügynél indokolt. Lezárt ügynél csak a
   * bejelentőnek és a moderáló adminoknak.
   */
  const showContact = (status: ReportStatus) => status === "ACTIVE" || isOwnerOrAdmin;

  // Kép-alapú párosítási találatok (mindkét irány), a nem elvetettek.
  const matchRows = await prisma.reportMatch.findMany({
    where:   { dismissed: false, OR: [{ reportAId: report.id }, { reportBId: report.id }] },
    include: { reportA: true, reportB: true },
    orderBy: [{ verdict: "asc" }, { score: "desc" }],
  });

  const VERDICT_ORDER: Record<string, number> = { LIKELY: 0, POSSIBLE: 1, UNLIKELY: 2 };
  const matches: MatchView[] = matchRows
    .map((row) => {
      const cp = row.reportAId === report.id ? row.reportB : row.reportA;
      return {
        id: row.id,
        verdict: row.verdict,
        score: row.score,
        reasons: row.reasons,
        distanceKm: row.distanceKm,
        daysApart: row.daysApart,
        counterpart: {
          id: cp.id,
          type: cp.type,
          name: cp.name,
          breed: cp.breed,
          color: cp.color,
          imageUrl: cp.imageUrl,
          city: cp.city,
          createdAt: cp.createdAt.toISOString(),
          // A MÁSIK bejelentés elérhetősége csak a saját bejelentés gazdájának
          // és az adminoknak jár, és csak amíg az az ügy aktív.
          ...(isOwnerOrAdmin && showContact(cp.status)
            ? { contactName: cp.contactName, contactPhone: cp.contactPhone, contactEmail: cp.contactEmail }
            : { contactName: null, contactPhone: null, contactEmail: null }),
        },
      };
    })
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || b.score - a.score);

  const typeLabel: Record<ReportType, string>     = { LOST: t("lost"), FOUND: t("found"), STRAY: t("stray") };
  const statusLabel: Record<ReportStatus, string> = { ACTIVE: t("active"), RESOLVED: t("resolved"), CLOSED: t("closed") };
  const species: Record<AnimalType, string>        = {
    DOG: ta("dog"), CAT: ta("cat"), RABBIT: ta("rabbit"), BIRD: ta("bird"), OTHER: ta("other"),
  };
  const ctaTitle: Record<ReportType, string> = {
    LOST: t("contactCtaLost"), FOUND: t("contactCtaFound"), STRAY: t("contactCtaStray"),
  };
  const ctaDesc: Record<ReportType, string> = {
    LOST: t("contactCtaLostDesc"), FOUND: t("contactCtaFoundDesc"), STRAY: t("contactCtaStrayDesc"),
  };

  const style       = REPORT_TYPE_STYLE[report.type];
  const SpeciesIcon = SPECIES_ICON[report.animalType];
  const title       = report.name ?? report.breed ?? species[report.animalType];
  const active      = report.status === "ACTIVE";
  const canResolve  = isOwnerOrAdmin && active;

  // Galéria: a relációs képek, visszaesve a régi egy-képes imageUrl mezőre.
  const gallery =
    report.images.length > 0 ? report.images.map((img) => img.url)
    : report.imageUrl         ? [report.imageUrl]
    : [];

  const gender =
    report.gender === "MALE"   ? t("genderMale")
    : report.gender === "FEMALE" ? t("genderFemale")
    : null;

  const facts: { label: string; value: string }[] = [
    { label: t("speciesField"), value: species[report.animalType] },
    ...(report.breed ? [{ label: t("breedField"), value: report.breed }] : []),
    ...(report.color ? [{ label: t("colorField"), value: report.color }] : []),
    ...(gender       ? [{ label: t("genderField"), value: gender }] : []),
    { label: t("locationSection"), value: [report.city, report.address].filter(Boolean).join(", ") },
    {
      label: t("reportedAt"),
      value: report.createdAt.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        {/* Cím */}
        <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", style.solid)}>
                {typeLabel[report.type]}
              </span>
              {!active && (
                <span className="rounded-md bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                  {statusLabel[report.status]}
                </span>
              )}
              <time dateTime={report.createdAt.toISOString()} className="text-sm text-gray-500">
                {relativeTime(report.createdAt, locale)}
              </time>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-gray-600">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              {report.city}{report.address ? `, ${report.address}` : ""}
            </p>
          </div>
          <ShareButton
            variant="button"
            url={`/reports/${report.id}`}
            title={`${typeLabel[report.type]}: ${title} – ÁllatiMenhelyek.hu`}
          />
        </header>

        {/* Mobilon a sorrend fotó → elérhetőség → leírás: a kapcsolatfelvétel az
            oldal egyetlen fontos teendője, ne a lap alján legyen. Asztali
            nézetben az elérhetőség jobbra kerül, és görgetés közben is látszik. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-8">

          <div className="min-w-0 lg:col-start-1">
            {gallery.length > 0 ? (
              <div className="space-y-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                  <Image
                    src={gallery[0]}
                    alt={title}
                    fill
                    priority
                    className={cn("object-cover", !active && "grayscale")}
                    sizes="(min-width: 1024px) 700px, 100vw"
                  />
                </div>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.slice(1, 5).map((url, i) => (
                      <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                        <Image src={url} alt={`${title} ${i + 2}`} fill className="object-cover" sizes="170px" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className={cn("flex aspect-[16/9] items-center justify-center rounded-xl", style.tint)}>
                <SpeciesIcon className={cn("h-20 w-20 opacity-50", style.ink)} strokeWidth={1.25} />
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <section className={cn("rounded-xl border p-5", active ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-100")}>
              {showContact(report.status) ? (
                <>
                  <h2 className="font-display text-lg font-semibold text-gray-900">
                    {active ? ctaTitle[report.type] : t("contactTitle")}
                  </h2>
                  {active && <p className="mt-1 text-sm text-gray-600">{ctaDesc[report.type]}</p>}

                  <p className="mt-4 text-sm">
                    <span className="text-gray-500">{t("reportedBy")}</span>{" "}
                    <span className="font-semibold text-gray-900">{report.contactName}</span>
                  </p>

                  <div className="mt-3 space-y-2">
                    {report.contactPhone && (
                      <a
                        href={`tel:${report.contactPhone}`}
                        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                      >
                        <Phone className="h-4 w-4" />
                        {report.contactPhone}
                      </a>
                    )}
                    <a
                      href={`mailto:${report.contactEmail}`}
                      className={cn(
                        "flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
                        report.contactPhone
                          ? "border border-gray-300 bg-white text-graphite hover:border-brand-600 hover:text-brand-700"
                          : "bg-brand-700 text-white hover:bg-brand-800",
                      )}
                    >
                      <Mail className="h-4 w-4" />
                      {t("emailAction")}
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">{t("contactHiddenClosed")}</p>
              )}

              {canResolve && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <ResolveButton reportId={report.id} />
                </div>
              )}
            </section>

            {report.lat && report.lng && (
              <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <StaticMap lat={report.lat} lng={report.lng} type={report.type} animalType={report.animalType} />
                <p className="flex items-center gap-1.5 px-4 py-3 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  {report.city}{report.address ? `, ${report.address}` : ""}
                </p>
              </section>
            )}
          </aside>

          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 sm:p-6 lg:col-start-1">
              <h2 className="text-base font-semibold text-gray-900">{t("descSection")}</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-700">{report.description}</p>

              <dl className="mt-6 grid grid-cols-1 gap-x-6 border-t border-gray-100 sm:grid-cols-2">
                {facts.map((f) => (
                  <div key={f.label} className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm">
                    <dt className="text-gray-500">{f.label}</dt>
                    <dd className="text-right font-medium text-gray-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
          </section>

        </div>

        <ReportMatches matches={matches} canManage={isOwnerOrAdmin} />
      </div>
    </div>
  );
}
