"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Loader2 } from "lucide-react";

interface Props {
  options:    { id: string; name: string }[];
  shelterId:  string | null;
}

/**
 * Menhely-váltó super adminnak. A választás sütibe kerül, így a dashboard
 * összes menhelyhez kötött oldala ugyanannak a menhelynek az adatait mutatja.
 * Üres választás = minden menhely együtt.
 */
export function ShelterSwitcher({ options, shelterId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  async function select(id: string) {
    setSaving(true);
    try {
      await fetch("/api/admin/acting-shelter", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shelterId: id || null }),
      });
      startTransition(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || pending;

  return (
    <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <Building2 className="h-3 w-3" />
        Kezelt menhely
      </label>
      <div className="relative">
        <select
          value={shelterId ?? ""}
          disabled={busy}
          onChange={(e) => select(e.target.value)}
          className="w-full appearance-none rounded-xl border border-gray-200 px-3 py-2 pr-8 text-sm font-medium text-gray-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
        >
          <option value="">Minden menhely</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
      {shelterId && (
        <p className="mt-1.5 text-[11px] text-gray-400">
          Az oldalak ennek a menhelynek az adatait mutatják.
        </p>
      )}
    </div>
  );
}
