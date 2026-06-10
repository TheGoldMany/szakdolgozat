"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { useTranslations } from "next-intl";

interface MonthPoint {
  month:    string; // "jan", "feb", …
  total:    number;
  approved: number;
  rejected: number;
}

interface Props {
  data: MonthPoint[];
}

export function ApplicationsBar({ data }: Props) {
  const t = useTranslations("dashboard");

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={14} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #f0f0f0", fontSize: 12 }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>} />
        <Bar dataKey="total"    name={t("barTotal")}    fill="#6366f1" radius={[4,4,0,0]} />
        <Bar dataKey="approved" name={t("barApproved")} fill="#22c55e" radius={[4,4,0,0]} />
        <Bar dataKey="rejected" name={t("barRejected")} fill="#f87171" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
