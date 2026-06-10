"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, AlertTriangle } from "lucide-react";

interface FosterOption { id: string; label: string }

interface Props {
  animalId:        string;
  currentFosterId: string | null;
  fosters:         FosterOption[];  // aktív ideiglenes befogadók
}

export function FosterAssign({ animalId, currentFosterId, fosters }: Props) {
  const router = useRouter();
  const t = useTranslations("foster");
  const [value, setValue]     = useState(currentFosterId ?? "");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleChange(fosterId: string) {
    setError(null); setSaving(true);
    const res = await fetch(`/api/animals/${animalId}/foster`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ fosterId: fosterId || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? t("error")); return; }
    setValue(fosterId);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Home className="h-4 w-4 text-purple-500" />
        <h2 className="text-base font-bold text-gray-900">{t("assignTitle")}</h2>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        {t("assignDesc")}
      </p>

      {fosters.length === 0 ? (
        <p className="text-sm text-gray-400">
          {t("assignNoFosters")}
        </p>
      ) : (
        <select value={value} onChange={e => handleChange(e.target.value)} disabled={saving}
          className="w-full max-w-sm rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:opacity-60">
          <option value="">{t("assignNone")}</option>
          {fosters.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  );
}
