"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import {
  Sparkles,
  CheckCircle2,
  HelpCircle,
  MapPin,
  Calendar,
  Phone,
  Mail,
  X,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type Verdict = "LIKELY" | "POSSIBLE" | "UNLIKELY";

export interface MatchCounterpart {
  id: string;
  type: "LOST" | "FOUND" | "STRAY";
  name: string | null;
  breed: string | null;
  color: string | null;
  imageUrl: string | null;
  city: string;
  createdAt: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string;
}

export interface MatchView {
  id: string;
  verdict: Verdict;
  score: number;
  reasons: string[];
  distanceKm: number | null;
  daysApart: number | null;
  counterpart: MatchCounterpart;
}

interface Props {
  matches: MatchView[];
  canManage: boolean;
}

const VERDICT_STYLE: Record<Verdict, { dot: string; badge: string; icon: React.ElementType }> = {
  LIKELY:   { dot: "bg-green-500",  badge: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  POSSIBLE: { dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700",  icon: HelpCircle },
  UNLIKELY: { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-500",    icon: HelpCircle },
};

export function ReportMatches({ matches, canManage }: Props) {
  const t = useTranslations("reports");
  const router = useRouter();
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = matches.filter((m) => !hidden.has(m.id));
  if (visible.length === 0) return null;

  const VERDICT_LABEL: Record<Verdict, string> = {
    LIKELY:   t("matchLikely"),
    POSSIBLE: t("matchPossible"),
    UNLIKELY: t("matchUnlikely"),
  };
  const TYPE_LABEL: Record<MatchCounterpart["type"], string> = {
    LOST: t("lost"), FOUND: t("found"), STRAY: t("stray"),
  };

  async function dismiss(id: string) {
    setDismissing(id);
    try {
      const res = await fetch(`/api/report-matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed: true }),
      });
      if (res.ok) {
        setHidden((prev) => new Set(prev).add(id));
        toast.info(t("matchDismissed"));
        router.refresh();
      } else {
        toast.error(t("matchDismissError"));
      }
    } catch {
      toast.error(t("matchDismissError"));
    } finally {
      setDismissing(null);
    }
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-500" />
        <h2 className="text-lg font-bold text-gray-900">{t("matchesTitle")}</h2>
      </div>
      <p className="mb-4 text-sm text-gray-500">{t("matchesIntro")}</p>

      <div className="space-y-4">
        {visible.map((m) => {
          const style = VERDICT_STYLE[m.verdict];
          const VIcon = style.icon;
          const cp = m.counterpart;
          return (
            <div
              key={m.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-4 py-2.5">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", style.badge)}>
                  <VIcon className="h-3.5 w-3.5" />
                  {VERDICT_LABEL[m.verdict]}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => dismiss(m.id)}
                    disabled={dismissing === m.id}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> {t("matchDismiss")}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                {/* Kép */}
                <Link
                  href={`/reports/${cp.id}`}
                  className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-32 sm:w-32"
                >
                  {cp.imageUrl ? (
                    <Image
                      src={cp.imageUrl}
                      alt={cp.name ?? cp.breed ?? TYPE_LABEL[cp.type]}
                      fill className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <PawPrint className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </Link>

                {/* Részletek */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {TYPE_LABEL[cp.type]}
                    </span>
                    <Link href={`/reports/${cp.id}`} className="font-semibold text-gray-900 hover:text-brand-600">
                      {cp.name ?? cp.breed ?? t("unknownAnimal")}
                    </Link>
                  </div>

                  {/* Indoklások */}
                  {m.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {m.reasons.slice(0, 5).map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-gray-600">
                          <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Meta */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {cp.city}
                      {m.distanceKm != null && ` · ~${Math.round(m.distanceKm)} km`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(cp.createdAt).toLocaleDateString("hu-HU", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Kapcsolat */}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {cp.contactPhone && (
                      <a href={`tel:${cp.contactPhone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors">
                        <Phone className="h-3.5 w-3.5" /> {cp.contactPhone}
                      </a>
                    )}
                    <a href={`mailto:${cp.contactEmail}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors">
                      <Mail className="h-3.5 w-3.5" /> {t("matchContact")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
