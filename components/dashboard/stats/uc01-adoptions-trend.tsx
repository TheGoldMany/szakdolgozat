"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useTranslations } from "next-intl";

const SPECIES_COLORS: Record<string, string> = {
  DOG:    "#3b82f6",
  CAT:    "#f59e0b",
  RABBIT: "#10b981",
  BIRD:   "#a855f7",
  OTHER:  "#94a3b8",
};

interface MonthlyPoint {
  month: string;
  label: string;
  DOG: number;
  CAT: number;
  RABBIT: number;
  BIRD: number;
  OTHER: number;
}

interface SpeciesRow {
  type: string;
  label: string;
  count: number;
}

interface Props {
  totalAdoptions: number;
  yoyGrowth: number | null;
  thisYearApps: number;
  lastYearApps: number;
  monthlyTrend: MonthlyPoint[];
  bySpecies: SpeciesRow[];
}

export function Uc01AdoptionsTrend({
  totalAdoptions, yoyGrowth, thisYearApps, lastYearApps, monthlyTrend, bySpecies,
}: Props) {
  const t = useTranslations("dashboard");

  const SPECIES_LABELS: Record<string, string> = {
    DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb",
  };

  const trendLast8 = monthlyTrend.slice(-8);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">UC-01 · Örökbefogadások trendje</h2>
          <p className="text-xs text-gray-400 mt-0.5">24 hónapos összesítő, faj szerinti bontásban</p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs text-gray-400">Idén</p>
            <p className="text-xl font-bold text-gray-800">{thisYearApps}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Tavaly</p>
            <p className="text-xl font-bold text-gray-500">{lastYearApps}</p>
          </div>
          {yoyGrowth !== null && (
            <div>
              <p className="text-xs text-gray-400">Éves növ.</p>
              <p className={`text-xl font-bold ${yoyGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {yoyGrowth >= 0 ? "+" : ""}{yoyGrowth}%
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Area chart — 24-month trend */}
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendLast8} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                {Object.entries(SPECIES_COLORS).map(([k, color]) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                formatter={(v, name) => [v, SPECIES_LABELS[String(name)] ?? name]}
              />
              <Legend
                iconType="circle" iconSize={7}
                formatter={(v) => <span style={{ fontSize: 10, color: "#555" }}>{SPECIES_LABELS[v] ?? v}</span>}
              />
              {Object.keys(SPECIES_COLORS).map((k) => (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={SPECIES_COLORS[k]}
                  fill={`url(#grad-${k})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Species donut */}
        <div className="flex flex-col items-center justify-center">
          {bySpecies.length === 0 ? (
            <p className="text-xs text-gray-400">{t("chartNoData")}</p>
          ) : (
            <div className="relative w-full">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={bySpecies.map((s) => ({ name: s.label, value: s.count }))}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {bySpecies.map((s) => (
                      <Cell key={s.type} fill={SPECIES_COLORS[s.type] ?? "#94a3b8"} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${v} db`, ""]}
                    contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-800">{totalAdoptions}</span>
                <span className="text-xs text-gray-400">db</span>
              </div>
            </div>
          )}
          <ul className="mt-2 space-y-1 w-full px-2">
            {bySpecies.map((s) => (
              <li key={s.type} className="flex items-center justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: SPECIES_COLORS[s.type] }} />
                  {s.label}
                </span>
                <span className="font-medium">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
