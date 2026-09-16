"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Day {
  date:     string;   // YYYY-MM-DD
  postId:   string;
  imageUrl: string;
  caption:  string | null;
  count:    number;
}

/**
 * Napi képek naptára – a szerző saját, a folyamból már kiesett képei.
 *
 * A napokra bontást a SZERVER adja `YYYY-MM-DD` alakban, a megjelenítés
 * időzónájában. Ha a kliens csoportosítana, két ember ugyanazt a képet más
 * naphoz sorolná, és a naptár nem stimmelne a „mikor töltöttem fel" emlékkel.
 *
 * A rács hétfővel indul: a magyar (és a legtöbb európai) naptár így néz ki,
 * a `Date.getDay()` viszont vasárnappal kezd — ezért a `(nap + 6) % 7`.
 */
export function DailyCalendar() {
  const t      = useTranslations("daily");
  const locale = useLocale();

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days,  setDays]  = useState<Day[] | null>(null);
  const [open,  setOpen]  = useState<Day | null>(null);

  const load = useCallback(async (y: number, m: number) => {
    setDays(null);
    try {
      const res  = await fetch(`/api/daily-posts/calendar?year=${y}&month=${m}`);
      const json = await res.json().catch(() => ({ days: [] }));
      setDays(res.ok ? (json.days ?? []) : []);
    } catch {
      setDays([]);
    }
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  function shift(by: number) {
    const d = new Date(year, month - 1 + by, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const byDate     = new Map((days ?? []).map((d) => [d.date, d]));
  const daysInMonth = new Date(year, month, 0).getDate();
  // Hétfő-kezdés: a hónap 1-jének helye a rácsban.
  const firstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" })
    .format(new Date(year, month - 1, 1));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" })
      // 2024-01-01 hétfő volt – innen indítjuk a sorozatot.
      .format(new Date(2024, 0, 1 + i)));

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button" onClick={() => shift(-1)} aria-label={t("calendarPrev")}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
        <button
          type="button" onClick={() => shift(1)} aria-label={t("calendarNext")}
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </header>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekdays.map((w) => (
          <span key={w} className="py-1 text-center text-[10px] font-semibold uppercase text-gray-400">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstOffset }, (_, i) => <span key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const key    = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const entry  = byDate.get(key);

          if (!entry) {
            return (
              <span
                key={key}
                className="flex aspect-square items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-300"
              >
                {dayNum}
              </span>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpen(entry)}
              aria-label={`${key}${entry.count > 1 ? ` – ${t("calendarMore", { count: entry.count })}` : ""}`}
              className="press-card relative aspect-square overflow-hidden rounded-lg ring-1 ring-brand-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-[10px] font-semibold text-white">
                {dayNum}
              </span>
              {entry.count > 1 && (
                <span className="absolute right-0.5 top-0.5 rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white">
                  {entry.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {days === null && (
        <p className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </p>
      )}
      {days?.length === 0 && (
        <p className="pt-4 text-center text-xs text-gray-400">{t("calendarEmpty")}</p>
      )}

      {/* Nagyított kép */}
      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-[9997] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="animate-modal relative max-h-full w-full max-w-md overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Bezárás"
              className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-gray-700 shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.imageUrl} alt={open.caption ?? ""} className="max-h-[70vh] w-full object-contain bg-gray-100" />
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-500">{open.date}</p>
              {open.caption && <p className="mt-1 text-sm text-gray-700">{open.caption}</p>}
              {open.count > 1 && (
                <p className={cn("mt-1 text-xs text-gray-400")}>
                  {t("calendarMore", { count: open.count })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
