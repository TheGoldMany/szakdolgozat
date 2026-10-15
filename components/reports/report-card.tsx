import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus, AnimalType } from "@prisma/client";
import { getTranslations, getLocale } from "next-intl/server";
import { REPORT_TYPE_STYLE, SPECIES_ICON, relativeTime } from "@/lib/report-style";

interface ReportCardProps {
  report: {
    id: string;
    type: ReportType;
    status: ReportStatus;
    animalType: AnimalType;
    name: string | null;
    breed: string | null;
    color: string | null;
    city: string;
    description: string;
    imageUrl: string | null;
    createdAt: Date;
  };
  /** Első sorban álló kártyák képe előbb töltődjön (LCP). */
  priority?: boolean;
}

/**
 * Bejelentés-kártya a rácsos listához.
 *
 * A fotó az első, mert egy elveszett állatot a látogató ránézésre ismer fel,
 * nem a leírásból. Telefonon a kártya sor (bélyegkép balra), hogy egy
 * képernyőre több bejelentés férjen, és ne kelljen végtelenül görgetni. A bejelentő elérhetősége SZÁNDÉKOSAN nincs a kártyán:
 * a részletes oldal csak aktív ügynél mutatja, a lista eddig viszont
 * minden bejelentőnek kiírta az e-mail-címét, a lezártakét is.
 */
export async function ReportCard({ report, priority }: ReportCardProps) {
  const [t, ta, locale] = await Promise.all([
    getTranslations("reports"),
    getTranslations("animals"),
    getLocale(),
  ]);

  const typeLabel: Record<ReportType, string> = { LOST: t("lost"), FOUND: t("found"), STRAY: t("stray") };
  const statusLabel: Record<ReportStatus, string> = { ACTIVE: t("active"), RESOLVED: t("resolved"), CLOSED: t("closed") };
  const species: Record<AnimalType, string> = {
    DOG: ta("dog"), CAT: ta("cat"), RABBIT: ta("rabbit"), BIRD: ta("bird"), OTHER: ta("other"),
  };

  const style       = REPORT_TYPE_STYLE[report.type];
  const SpeciesIcon = SPECIES_ICON[report.animalType];
  const closed      = report.status !== "ACTIVE";

  // Cím: a név, ha van; különben a fajta; végső esetben a faj.
  const title    = report.name ?? report.breed ?? species[report.animalType];
  const subtitle = [
    species[report.animalType],
    report.name ? report.breed : null,
    report.color,
  ].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/reports/${report.id}`}
      className="press-card group flex h-full overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300 sm:flex-col"
    >
      <div className={cn("relative min-h-[7rem] w-28 shrink-0 overflow-hidden sm:aspect-[4/3] sm:min-h-0 sm:w-auto", report.imageUrl ? "bg-gray-100" : style.tint)}>
        {report.imageUrl ? (
          <Image
            src={report.imageUrl}
            alt={title}
            fill
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
              closed && "grayscale",
            )}
            sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 112px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <SpeciesIcon className={cn("h-10 w-10 opacity-60 sm:h-14 sm:w-14", style.ink)} strokeWidth={1.25} />
          </div>
        )}

        <span className={cn("absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[11px] font-semibold sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-xs", style.solid)}>
          {typeLabel[report.type]}
        </span>
        {closed && (
          <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700 sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:px-2 sm:py-1 sm:text-xs">
            {statusLabel[report.status]}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <h3 className="truncate font-display text-base font-semibold text-gray-900 group-hover:text-brand-700">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>}
        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-gray-600 sm:mt-2 sm:leading-relaxed">{report.description}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-xs text-gray-500 sm:pt-3">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{report.city}</span>
          </span>
          <time dateTime={report.createdAt.toISOString()} className="shrink-0">
            {relativeTime(report.createdAt, locale)}
          </time>
        </div>
      </div>
    </Link>
  );
}
