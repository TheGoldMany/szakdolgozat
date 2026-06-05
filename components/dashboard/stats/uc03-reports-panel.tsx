"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface CityRow { city: string; lost: number; found: number; stray: number; total: number }
interface TypeRow  { type: string; label: string; count: number }

interface Props {
  lostCount: number;
  foundCount: number;
  strayCount: number;
  matchRate: number;
  lostMinusFound: number;
  byReportType: TypeRow[];
  reportsByCity: CityRow[];
}

const TYPE_COLORS: Record<string, string> = {
  LOST:  "#ef4444",
  FOUND: "#22c55e",
  STRAY: "#f59e0b",
};

export function Uc03ReportsPanel({
  lostCount, foundCount, strayCount, matchRate, lostMinusFound, byReportType, reportsByCity,
}: Props) {
  const total = lostCount + foundCount + strayCount;

  const cityData = reportsByCity.slice(0, 8).map((c) => ({
    name: c.city.length > 12 ? c.city.slice(0, 12) + "…" : c.city,
    fullName: c.city,
    Elveszett: c.lost,
    Megtalált: c.found,
    Kóbor:     c.stray,
  }));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">UC-03 · Területi bejelentések</h2>
          <p className="text-xs text-gray-400 mt-0.5">Elveszett / megtalált / kóbor — platform-szerte</p>
        </div>
        <div className="flex gap-4 text-right flex-wrap">
          <div>
            <p className="text-xs text-gray-400">Összes</p>
            <p className="text-xl font-bold text-gray-800">{total}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Match rate</p>
            <p className="text-xl font-bold text-emerald-600">{matchRate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Elveszett − Megtalált</p>
            <p className={`text-xl font-bold ${lostMinusFound > 0 ? "text-red-500" : "text-emerald-600"}`}>
              {lostMinusFound > 0 ? "+" : ""}{lostMinusFound}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Donut by type */}
        <div className="flex flex-col items-center">
          {byReportType.length === 0 ? (
            <p className="text-xs text-gray-400 py-8">Nincs bejelentés</p>
          ) : (
            <>
              <div className="relative w-full">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={byReportType.map((r) => ({ name: r.label, value: r.count }))}
                      cx="50%" cy="50%"
                      innerRadius={46} outerRadius={66}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {byReportType.map((r) => (
                        <Cell key={r.type} fill={TYPE_COLORS[r.type] ?? "#94a3b8"} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v} db`, ""]}
                      contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-800">{total}</span>
                  <span className="text-xs text-gray-400">db</span>
                </div>
              </div>
              <ul className="mt-1 space-y-1 w-full px-2">
                {byReportType.map((r) => (
                  <li key={r.type} className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLORS[r.type] }} />
                      {r.label}
                    </span>
                    <span className="font-medium">{r.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* City bar chart */}
        <div className="lg:col-span-2">
          <p className="mb-2 text-xs font-medium text-gray-500">Top városok</p>
          {cityData.length === 0 ? (
            <p className="text-xs text-gray-400">Nincs területi adat</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cityData} layout="vertical" margin={{ top: 0, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                  formatter={(v, name) => [v, name]}
                  labelFormatter={(label, payload) => {
                    const full = payload?.[0]?.payload?.fullName ?? label;
                    return full;
                  }}
                />
                <Legend iconType="circle" iconSize={7}
                  formatter={(v) => <span style={{ fontSize: 10, color: "#555" }}>{v}</span>}
                />
                <Bar dataKey="Elveszett" stackId="a" fill="#ef4444" radius={0} />
                <Bar dataKey="Megtalált" stackId="a" fill="#22c55e" radius={0} />
                <Bar dataKey="Kóbor"     stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
