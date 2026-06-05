import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  label:    string;
  value:    number | string;
  icon:     LucideIcon;
  iconBg:   string;
  iconColor: string;
  trend?:   { value: number; label: string };
  href?:    string;
  suffix?:  string;
}

export function KpiCard({ label, value, icon: Icon, iconBg, iconColor, trend, suffix }: Props) {
  const trendPositive = trend && trend.value > 0;
  const trendNeutral  = trend && trend.value === 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {typeof value === "number" ? value.toLocaleString("hu-HU") : value}
            {suffix && <span className="ml-1 text-base font-medium text-gray-400">{suffix}</span>}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          {trendNeutral ? (
            <Minus className="h-3.5 w-3.5 text-gray-400" />
          ) : trendPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className={`text-xs font-medium ${trendNeutral ? "text-gray-400" : trendPositive ? "text-green-600" : "text-red-500"}`}>
            {trend.value > 0 ? "+" : ""}{trend.value}
          </span>
          <span className="text-xs text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
