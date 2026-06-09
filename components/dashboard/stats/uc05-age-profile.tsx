"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Database } from "lucide-react";

interface AgeCatRow  { category: string; label: string; count: number }
interface AppCntRow  { label: string; count: number }
interface CrossRow   { type: string; label: string; PUPPY: number; YOUNG: number; ADULT: number; SENIOR: number; UNKNOWN: number }

interface Props {
  ageCategoryDist: AgeCatRow[];
  appCountDist:    AppCntRow[];
  speciesAgeCross: CrossRow[];
  dwhAvailable:    boolean;
}

const AGE_COLORS: Record<string, string> = {
  PUPPY:   "#34d399",
  YOUNG:   "#60a5fa",
  ADULT:   "#f59e0b",
  SENIOR:  "#a78bfa",
  UNKNOWN: "#cbd5e1",
};

const APP_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export function Uc05AgeProfile({ ageCategoryDist, appCountDist, speciesAgeCross, dwhAvailable }: Props) {
  const total = ageCategoryDist.reduce((s, r) => s + r.count, 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">UC-05 &middot; Adoptált állatok korfája és versenyhelyzet</h2>
          <p className="text-xs text-gray-400 mt-0.5">Korosztály-megoszlás és pályázatok száma (DWH-alapú)</p>
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
          A DWH adatbázis jelenleg nem elérhető (felfüggesztett Neon példány). Az ETL futtatása után frissül az adat.
        </div>
      )}

      {dwhAvailable && total === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">Nincs elegendő DWH-adat. Futtasd le az ETL-t!</p>
      )}

      {dwhAvailable && total > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Kor megoszlas – pie */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Korosztály megoszlás ({total} adoptált állat)</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={ageCategoryDist}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    (percent ?? 0) > 0.05 ? `${(name ?? "").split(" ")[0]} ${Math.round((percent ?? 0) * 100)}%` : ""
                  }
                  labelLine={false}
                >
                  {ageCategoryDist.map((r) => (
                    <Cell key={r.category} fill={AGE_COLORS[r.category] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                  formatter={(v, name) => [v, name]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Palyazatszam eloszlas */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Mennyi pályázat érkezett az állathoz?</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={appCountDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                  formatter={(v) => [v, "állat"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {appCountDist.map((_, i) => (
                    <Cell key={i} fill={APP_COLORS[i % APP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Faj × korosztaly kereszttabla */}
      {dwhAvailable && speciesAgeCross.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Faj × korosztály (adoptált állatok)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-1.5 pr-3 text-left font-semibold text-gray-500">Faj</th>
                  {["PUPPY","YOUNG","ADULT","SENIOR","UNKNOWN"].map((cat) => (
                    <th key={cat} className="px-2 py-1.5 text-center font-semibold" style={{ color: AGE_COLORS[cat] }}>
                      {cat === "PUPPY" ? "Kölyök" : cat === "YOUNG" ? "Fiatal" : cat === "ADULT" ? "Felnőtt" : cat === "SENIOR" ? "Idős" : "Ismeretlen"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {speciesAgeCross.map((row) => {
                  const rowTotal = row.PUPPY + row.YOUNG + row.ADULT + row.SENIOR + row.UNKNOWN;
                  return (
                    <tr key={row.type} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 pr-3 font-medium text-gray-700">{row.label}</td>
                      {(["PUPPY","YOUNG","ADULT","SENIOR","UNKNOWN"] as const).map((cat) => (
                        <td key={cat} className="px-2 py-1.5 text-center text-gray-600">
                          {row[cat] > 0 ? (
                            <span>
                              {row[cat]}
                              <span className="ml-1 text-gray-400">
                                ({rowTotal > 0 ? Math.round(row[cat] / rowTotal * 100) : 0}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-300">–</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
