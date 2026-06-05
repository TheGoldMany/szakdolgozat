"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface AvgStayRow { type: string; label: string; avgDays: number }
interface StayCatRow { label: string; days: string; count: number }
interface ShelterUtil {
  shelterId: string;
  name: string;
  occupied: number;
  capacity: number | null;
  utilizationRate: number | null;
}

interface Props {
  avgStayBySpecies: AvgStayRow[];
  stayCategories: StayCatRow[];
  shelterUtil: ShelterUtil[];
  avgUtilization: number | null;
}

const SPECIES_COLORS: Record<string, string> = {
  DOG: "#3b82f6", CAT: "#f59e0b", RABBIT: "#10b981", BIRD: "#a855f7", OTHER: "#94a3b8",
};

function UtilGauge({ rate }: { rate: number }) {
  const pct = Math.min(Math.max(rate * 100, 0), 100);
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#f0f0f0" strokeWidth={10} />
        <circle
          cx={45} cy={45} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
        />
        <text x={45} y={49} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
          {Math.round(pct)}%
        </text>
      </svg>
    </div>
  );
}

export function Uc02CapacityPanel({ avgStayBySpecies, stayCategories, shelterUtil, avgUtilization }: Props) {
  const stayBarData = stayCategories.map((c) => ({ name: c.label, db: c.count }));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">UC-02 · Kapacitás és tartózkodási idők</h2>
        <p className="text-xs text-gray-400 mt-0.5">Menhelyi kihasználtság és befogadási átlagok</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stay duration categories bar */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Tartózkodási idő kategóriák</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stayBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                formatter={(v) => [v, "db"]}
              />
              <Bar dataKey="db" radius={[6, 6, 0, 0]}>
                {stayBarData.map((_, i) => (
                  <Cell key={i} fill={["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg stay by species */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Átlagos tartózkodási idő (nap)</p>
          {avgStayBySpecies.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">Nincs elegendő adat</p>
          ) : (
            <ul className="space-y-2 mt-4">
              {avgStayBySpecies.map((s) => (
                <li key={s.type} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-semibold text-gray-800">{s.avgDays} nap</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.min((s.avgDays / 365) * 100, 100)}%`,
                        background: SPECIES_COLORS[s.type] ?? "#94a3b8",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Shelter utilization gauges */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-500">Menhelyi kihasználtság</p>
          {avgUtilization !== null && (
            <p className="text-xs text-gray-400">
              Átlag: <span className="font-semibold text-gray-700">{Math.round(avgUtilization * 100)}%</span>
            </p>
          )}
        </div>
        {shelterUtil.length === 0 ? (
          <p className="text-xs text-gray-400">Nincs kapacitásadat</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {shelterUtil.map((s) => (
              <div key={s.shelterId} className="flex flex-col items-center gap-1 min-w-[80px]">
                {s.utilizationRate !== null
                  ? <UtilGauge rate={s.utilizationRate} />
                  : (
                    <div className="flex h-[90px] w-[90px] items-center justify-center rounded-full bg-gray-50">
                      <span className="text-[10px] text-gray-400 text-center leading-tight px-2">Nincs kapacitás</span>
                    </div>
                  )
                }
                <p className="text-[10px] text-gray-500 text-center max-w-[80px] leading-tight">{s.name}</p>
                <p className="text-[10px] text-gray-400">{s.occupied}{s.capacity ? `/${s.capacity}` : ""} állat</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
