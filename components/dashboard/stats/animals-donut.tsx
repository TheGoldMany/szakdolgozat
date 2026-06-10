"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useTranslations } from "next-intl";

interface Props {
  data: { status: string; count: number }[];
}

export function AnimalsDonut({ data }: Props) {
  const t = useTranslations("dashboard");

  const STATUS_CONFIG: Record<string, { labelKey: string; color: string }> = {
    AVAILABLE:    { labelKey: "animals.available",  color: "#22c55e" },
    PENDING:      { labelKey: "animals.pending",    color: "#eab308" },
    ADOPTED:      { labelKey: "animals.adopted",    color: "#3b82f6" },
    FOSTER:       { labelKey: "animals.foster",     color: "#a855f7" },
    MEDICAL_HOLD: { labelKey: "animals.medicalHold", color: "#ef4444" },
  };

  // Fallback Hungarian labels if translation keys aren't in the animals namespace
  const STATUS_LABELS: Record<string, string> = {
    AVAILABLE:    "Örökbefogadható",
    PENDING:      "Függőben",
    ADOPTED:      "Örökbefogadott",
    FOSTER:       "Ideiglenes",
    MEDICAL_HOLD: "Orvosi kezelés",
  };

  const chartData = data.map(d => ({
    name:  STATUS_LABELS[d.status] ?? d.status,
    value: d.count,
    color: STATUS_CONFIG[d.status]?.color ?? "#94a3b8",
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%" cy="50%"
            innerRadius={65} outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`${v} db`, ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }}
          />
          <Legend
            iconType="circle" iconSize={8}
            formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
        <span className="text-2xl font-bold text-gray-800">{total}</span>
        <span className="text-xs text-gray-400">{t("donutAnimalCount")}</span>
      </div>
    </div>
  );
}
