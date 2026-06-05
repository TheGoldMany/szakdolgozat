"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface HomeTypeRow { homeType: string; label: string; count: number }
interface AdopterProfile { withGarden: number; withChildren: number; withPets: number }

interface Props {
  returnRate: number;
  yoyReturnRateChange: number | null;
  returnAnimals: number;
  uniqueAnimals: number;
  adoptionsByHomeType: HomeTypeRow[];
  adoptionsByProfile: AdopterProfile;
}

const HOME_COLORS: Record<string, string> = {
  HOUSE:     "#3b82f6",
  APARTMENT: "#a855f7",
  OTHER:     "#94a3b8",
};

function RadialMeter({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
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
        <text x={45} y={50} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
          {value}%
        </text>
      </svg>
      <p className="text-[11px] text-gray-500 text-center leading-tight">{label}</p>
    </div>
  );
}

export function Uc04ReturnRate({
  returnRate, yoyReturnRateChange, returnAnimals, uniqueAnimals,
  adoptionsByHomeType, adoptionsByProfile,
}: Props) {
  const homeBarData = adoptionsByHomeType.map((h) => ({ name: h.label, db: h.count }));

  const profileMetrics = [
    { label: "Kerttel",    value: adoptionsByProfile.withGarden,   color: "#22c55e" },
    { label: "Gyerekkel",  value: adoptionsByProfile.withChildren, color: "#3b82f6" },
    { label: "Háziállattal", value: adoptionsByProfile.withPets,   color: "#a855f7" },
  ];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">UC-04 · Visszatérési arány és örökbefogadói profil</h2>
          <p className="text-xs text-gray-400 mt-0.5">Visszakerülő állatok és az örökbefogadók jellemzői</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Return rate KPI */}
        <div className="flex flex-col items-center justify-center gap-3 py-2">
          <div className="text-center">
            <p className="text-5xl font-extrabold text-gray-800">{returnRate}%</p>
            <p className="text-xs text-gray-400 mt-1">Visszakerülési arány</p>
          </div>
          <div className="flex gap-6 text-center mt-2">
            <div>
              <p className="text-sm font-bold text-gray-700">{returnAnimals}</p>
              <p className="text-[10px] text-gray-400">visszakerülő</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-700">{uniqueAnimals}</p>
              <p className="text-[10px] text-gray-400">egyedi állat</p>
            </div>
          </div>
          {yoyReturnRateChange !== null && (
            <div className="text-center mt-1">
              <span className={`text-sm font-semibold ${yoyReturnRateChange <= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {yoyReturnRateChange > 0 ? "+" : ""}{yoyReturnRateChange} pp
              </span>
              <span className="ml-1 text-[10px] text-gray-400">éves változás</span>
            </div>
          )}
        </div>

        {/* Home type bar */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Lakóhely típusa</p>
          {homeBarData.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">Nincs adat</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={homeBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #f0f0f0", fontSize: 11 }}
                  formatter={(v) => [v, "db"]}
                />
                <Bar dataKey="db" radius={[6, 6, 0, 0]}>
                  {adoptionsByHomeType.map((h) => (
                    <Cell key={h.homeType} fill={HOME_COLORS[h.homeType] ?? "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Adopter profile gauges */}
        <div>
          <p className="mb-3 text-xs font-medium text-gray-500">Örökbefogadói jellemzők</p>
          <div className="flex gap-3 flex-wrap justify-center">
            {profileMetrics.map((m) => (
              <RadialMeter key={m.label} value={m.value} label={m.label} color={m.color} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
