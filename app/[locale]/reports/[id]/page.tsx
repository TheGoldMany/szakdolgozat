import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { MapPin, Phone, Mail, Calendar, Search, Home, Navigation } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { ResolveButton } from "@/components/reports/resolve-button";
import { ReportMatches, type MatchView } from "@/components/reports/report-matches";
import { StaticMap } from "@/components/ui/static-map";
import { ShareButton } from "@/components/ui/share-button";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

const TYPE_ICON: Record<ReportType, React.ElementType> = {
  LOST: Search, FOUND: Home, STRAY: Navigation,
};

const TYPE_COLOR: Record<ReportType, { badge: string; bg: string }> = {
  LOST:  { badge: "bg-red-100 text-red-700",       bg: "bg-red-50"    },
  FOUND: { badge: "bg-brand-100 text-brand-700",   bg: "bg-brand-50"  },
  STRAY: { badge: "bg-yellow-100 text-yellow-700", bg: "bg-yellow-50" },
};

const STATUS_COLOR: Record<ReportStatus, string> = {
  ACTIVE:   "bg-blue-100 text-blue-700",
  RESOLVED: "bg-gray-100 text-gray-500",
  CLOSED:   "bg-gray-100 text-gray-400",
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const [r, t] = await Promise.all([
    prisma.animalReport.findUnique({ where: { id: params.id }, select: { type: true, city: true } }),
    getTranslations("reports"),
  ]);
  if (!r) return { title: t("notFound") };
  const typeLabel = { LOST: t("lost"), FOUND: t("found"), STRAY: t("stray") }[r.type];
  return { title: `${typeLabel} – ${r.city}` };
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const [report, session, t] = await Promise.all([
    prisma.animalReport.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] } },
    }),
    getServerSession(authOptions),
    getTranslations("reports"),
  ]);

  if (!report) notFound();

  const isOwnerOrAdminForMatches =
    (session?.user?.id && report.userId === session.user.id) ||
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "SHELTER_ADMIN";

  // Kép-alapú párosítási találatok (mindkét irány), a nem elvetettek.
  const matchRows = await prisma.reportMatch.findMany({
    where: {
      dismissed: false,
      OR: [{ reportAId: report.id }, { reportBId: report.id }],
    },
    include: {
      reportA: true,
      reportB: true,
    },
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
          contactName: cp.contactName,
          contactPhone: cp.contactPhone,
          contactEmail: cp.contactEmail,
        },
      };
    })
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || b.score - a.score);

  const TYPE_LABEL: Record<ReportType, string> = {
    LOST: t("lost"), FOUND: t("found"), STRAY: t("stray"),
  };
  const STATUS_LABEL: Record<ReportStatus, string> = {
    ACTIVE: t("active"), RESOLVED: t("resolved"), CLOSED: t("closed"),
  };

  const typeColor = TYPE_COLOR[report.type];
  const Icon      = TYPE_ICON[report.type];
  const typeLabel = TYPE_LABEL[report.type];
  const statusLabel = STATUS_LABEL[report.status];
  const statusColor = STATUS_COLOR[report.status];

  // Galéria: a relációs képek, visszaesve a régi egy-képes imageUrl mezőre.
  const galleryImages =
    report.images.length > 0
      ? report.images.map((img) => img.url)
      : report.imageUrl
        ? [report.imageUrl]
        : [];

  const isOwner    = session?.user?.id && report.userId === session.user.id;
  const isAdmin    = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SHELTER_ADMIN";
  const canResolve = (isOwner || isAdmin) && report.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/reports" className="hover:text-brand-500">{t("title")}</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">{typeLabel}</span>
        </nav>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className={cn("px-6 py-5 flex items-center justify-between gap-3", typeColor.bg)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", typeColor.badge)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", typeColor.badge)}>
                  {typeLabel}
                </span>
                <h1 className="mt-1 text-xl font-bold text-gray-900">
                  {report.name ?? report.breed ?? t("unknownAnimal")}
                  {report.name && report.breed && ` (${report.breed})`}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusColor)}>
                {statusLabel}
              </span>
              <ShareButton url={`/reports/${report.id}`} title={`${report.name ?? report.breed ?? t("unknownAnimal")} – ÁllatiMenhelyek.hu`} />
            </div>
          </div>

          {galleryImages.length > 0 && (
            <div>
              <div className="relative h-56 w-full sm:h-72 bg-gray-100">
                <Image
                  src={galleryImages[0]}
                  alt={report.name ?? report.breed ?? t("unknownAnimal")}
                  fill className="object-cover"
                  sizes="(max-width: 672px) 100vw, 672px"
                  priority
                />
              </div>
              {galleryImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2 p-2">
                  {galleryImages.slice(1, 5).map((url, i) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={url}
                        alt={`${report.name ?? report.breed ?? t("unknownAnimal")} ${i + 2}`}
                        fill className="object-cover"
                        sizes="160px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {report.color && (
                <div>
                  <span className="text-gray-400">{t("colorLabel")}</span>{" "}
                  <span className="font-medium">{report.color}</span>
                </div>
              )}
              {report.gender && (
                <div>
                  <span className="text-gray-400">{t("genderLabel")}</span>{" "}
                  <span className="font-medium">
                    {report.gender === "MALE" ? t("genderMale") : report.gender === "FEMALE" ? t("genderFemale") : t("genderUnknown")}
                  </span>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">{t("descSection")}</h2>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{report.description}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <span>{report.city}{report.address ? `, ${report.address}` : ""}</span>
              </div>
              {report.lat && report.lng && <StaticMap lat={report.lat} lng={report.lng} />}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" />
              {new Date(report.createdAt).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}
            </div>

            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                {t("contactSection")} {report.contactName}
              </p>
              {report.contactPhone && (
                <a href={`tel:${report.contactPhone}`} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                  <Phone className="h-4 w-4" />{report.contactPhone}
                </a>
              )}
              <a href={`mailto:${report.contactEmail}`} className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <Mail className="h-4 w-4" />{report.contactEmail}
              </a>
            </div>

            {canResolve && <ResolveButton reportId={report.id} />}
          </div>
        </div>

        <ReportMatches matches={matches} canManage={!!isOwnerOrAdminForMatches} />
      </div>
    </div>
  );
}
