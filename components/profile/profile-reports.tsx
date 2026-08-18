"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Search, Home, Navigation, PawPrint, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportType = "LOST" | "FOUND" | "STRAY";
type ReportStatus = "ACTIVE" | "RESOLVED" | "CLOSED";

export interface ProfileReport {
  id: string;
  type: ReportType;
  status: ReportStatus;
  name: string | null;
  breed: string | null;
  imageUrl: string | null;
  city: string;
  createdAt: string;
  matchCount: number;
}

interface Props {
  reports: ProfileReport[];
}

const TYPE_ICON: Record<ReportType, React.ElementType> = {
  LOST: Search, FOUND: Home, STRAY: Navigation,
};
const TYPE_BADGE: Record<ReportType, string> = {
  LOST:  "bg-red-100 text-red-700",
  FOUND: "bg-brand-100 text-brand-700",
  STRAY: "bg-yellow-100 text-yellow-700",
};
const STATUS_BADGE: Record<ReportStatus, string> = {
  ACTIVE:   "bg-blue-100 text-blue-700",
  RESOLVED: "bg-gray-100 text-gray-500",
  CLOSED:   "bg-gray-100 text-gray-400",
};

export function ProfileReports({ reports }: Props) {
  const t  = useTranslations("profile");
  const tr = useTranslations("reports");
  const router = useRouter();
  const [finding, setFinding] = useState<string | null>(null);

  const TYPE_LABEL: Record<ReportType, string> = {
    LOST: tr("lost"), FOUND: tr("found"), STRAY: tr("stray"),
  };
  const STATUS_LABEL: Record<ReportStatus, string> = {
    ACTIVE: tr("active"), RESOLVED: tr("resolved"), CLOSED: tr("closed"),
  };

  async function findSimilar(id: string) {
    setFinding(id);
    try {
      await fetch(`/api/reports/${id}/match`, { method: "POST" });
    } catch {
      /* ignore — the detail page shows whatever matches were found */
    }
    router.push(`/reports/${id}`);
  }

  if (reports.length === 0) {
    return <p className="text-sm text-gray-400">{t("noReports")}</p>;
  }

  return (
    <ul className="space-y-3">
      {reports.map((r) => {
        const Icon = TYPE_ICON[r.type];
        return (
          <li key={r.id} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex gap-3 p-3">
              {/* Photo */}
              <Link
                href={`/reports/${r.id}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100"
              >
                {r.imageUrl ? (
                  <Image
                    src={r.imageUrl}
                    alt={r.name ?? r.breed ?? ""}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <PawPrint className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", TYPE_BADGE[r.type])}>
                    <Icon className="h-3 w-3" />{TYPE_LABEL[r.type]}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_BADGE[r.status])}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.matchCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {t("matchCount", { count: r.matchCount })}
                    </span>
                  )}
                </div>
                <Link
                  href={`/reports/${r.id}`}
                  className="mt-1 block truncate text-sm font-semibold text-gray-900 hover:text-brand-600"
                >
                  {r.name ?? r.breed ?? tr("unknownAnimal")}
                </Link>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{r.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(r.createdAt).toLocaleDateString("hu-HU", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => findSimilar(r.id)}
                  disabled={finding === r.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                  {finding === r.id ? t("findingSimilar") : t("findSimilar")}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
