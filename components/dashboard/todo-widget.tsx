import Link from "next/link";
import { ChevronRight, CheckCircle2, ListChecks, type LucideIcon } from "lucide-react";

export interface TodoItem {
  key:   string;
  label: string;
  count: number;
  href:  string;
  icon:  LucideIcon;
}

/**
 * Menhely admin „Teendők" összefoglaló – a napi cselekvést igénylő tételek
 * (időpontok, kérelmek, oltások, készlet, utánkövetés) egy helyen.
 * Csak a >0 elemszámú sorokat mutatja; ha nincs teendő, pozitív üres állapot.
 */
export function TodoWidget({ items }: { items: TodoItem[] }) {
  const active = items.filter((i) => i.count > 0);
  const total  = active.reduce((s, i) => s + i.count, 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-700">Teendők</h2>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{total}</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-gray-500">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          Minden elintézve — jelenleg nincs teendő.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {active.map(({ key, label, count, href, icon: Icon }) => (
            <li key={key}>
              <Link href={href} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <Icon className="h-4 w-4 text-amber-600" />
                </span>
                <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{count}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
