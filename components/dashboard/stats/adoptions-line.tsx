"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

interface MonthPoint {
  month:     string;
  adoptions: number;
}

interface Props {
  data: MonthPoint[];
}

export function AdoptionsLine({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="adoptGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }}
          formatter={(v) => [`${v} örökbefogadás`]}
        />
        <Area
          type="monotone" dataKey="adoptions" name="Örökbefogadás"
          stroke="#3b82f6" strokeWidth={2}
          fill="url(#adoptGradient)"
          dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
