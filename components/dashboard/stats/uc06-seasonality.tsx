"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Database, Clock, CalendarDays, PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";

interface QuarterRow { quarter: number; label: string; count: number }
interface WeekdayRow { day: number; label: string; count: number }
interface LastEtl    { finishedAt: string; elapsedMs: number; adoptionCount: number; inventoryCount: number }

interface Props {
  byQuarter:    QuarterRow[];
  byWeekday:    WeekdayRow[];
  weekendPct:   number | null;
  holidayCount: number;
  lastEtl:      LastEtl | null;
  dwhAvailable: boolean;
}

const QUARTER_COLORS = ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function Uc06Seasonality({ byQuarter, byWeekday, weekendPct, holidayCount, lastEtl, dwhAvailable }: Props) {
  const t = useTranslations("dashboard");
  const total = byQuarter.reduce((s, r) => s + r.count, 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">UC-06 &middot; Szezonalitás és adatfrissesség</h2>
          <p className="text-xs text-gray-400 mt-0.5">Adoptációk időbeli mintázata (DWH DimDate + ETL napló)</p>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          dwhAvailable
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}>
          <Database className="h-3 w-3" />
          {dwhAvailable ? "DWH elérhető" : "DWH nem elérhető"}
        </span>
      </div>

      {!dwhAvailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          A DWH adatbázis jelenleg nem elérhető. Az ETL futtatása után frissül az adat.
        </div>
      )}

      {/* ETL freshness banner */}
      {dwhAvailable && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Utolsó ETL futás</p>
              <p className="text-xs font-semibold text-gray-700">
                {lastEtl ? formatDate(lastEtl.finishedAt) : "Még nem futott"}
              </p>
            </div>
          </div>
          {lastEtl && (
            <>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Feldolgozott adoptációk</p>
                <p className="text-xs font-semibold text-gray-700">{lastEtl.adoptionCount} db</p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Futási idő</p>
                <p className="text-xs font-semibold text-gray-700">{(lastEtl.elapsedMs / 1000).toFixed(1)} mp</p>
              </div>
            </>
          )}
        </div>
      )}

      {dwhAvailable && total === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">{t("chartNoData")}</p>
      )}

      {dwhAvailable && total > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Negyedeves megoszlas */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Adoptációk negyedévenként</p>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={byQuarter} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                    formatter={(v) => [v, "adoptáció"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {byQuarter.map((_, i) => (
                      <Cell key={i} fill={QUARTER_COLORS[i % QUARTER_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Het napja szerint */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Adoptációk a hét napja szerint</p>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={byWeekday} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                    formatter={(v) => [v, "adoptáció"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {byWeekday.map((r) => (
                      <Cell key={r.day} fill={r.day === 0 || r.day === 6 ? "#f59e0b" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kiemelt mutatok */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <CalendarDays className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-lg font-bold text-gray-800">{weekendPct != null ? `${weekendPct}%` : "–"}</p>
                <p className="text-[10px] text-gray-400">hétvégén történt adoptáció</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <PartyPopper className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold text-gray-800">{holidayCount}</p>
                <p className="text-[10px] text-gray-400">ünnepnapon történt adoptáció</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
