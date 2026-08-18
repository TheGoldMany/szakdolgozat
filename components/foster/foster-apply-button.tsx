"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, X, CheckCircle } from "lucide-react";
import { ANIMAL_TYPE_LABELS, ALL_ANIMAL_TYPES, FOSTER_STATUS_LABELS, FOSTER_STATUS_COLORS } from "@/lib/foster";
import type { AnimalType, FosterStatus } from "@prisma/client";

interface Props {
  shelterId:       string;
  existingStatus?: FosterStatus | null;
}

export function FosterApplyButton({ shelterId, existingStatus }: Props) {
  const t      = useTranslations("foster");
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [types, setTypes]             = useState<AnimalType[]>([]);
  const [maxWeight, setMaxWeight]     = useState("");
  const [canQuarantine, setCanQ]      = useState(false);
  const [motivation, setMotivation]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  if (existingStatus) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${FOSTER_STATUS_COLORS[existingStatus]}`}>
        <Home className="h-3.5 w-3.5" />
        {t("fosterStatus", { status: FOSTER_STATUS_LABELS[existingStatus] })}
      </div>
    );
  }

  function toggleType(tp: AnimalType) {
    setTypes(prev => prev.includes(tp) ? prev.filter(x => x !== tp) : [...prev, tp]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch("/api/foster", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        shelterId,
        preferredTypes: types,
        maxWeightKg:    maxWeight ? Number(maxWeight) : undefined,
        canQuarantine,
        motivation:     motivation || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t("error")); return; }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
        <p className="font-semibold text-green-800">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-green-600">{t("successDesc")}</p>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors">
          <Home className="h-4 w-4" />
          {t("applyButton")}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">{t("formTitle")}</p>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">{t("animalTypesLabel")}</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ANIMAL_TYPES.map(tp => (
                <button key={tp} type="button" onClick={() => toggleType(tp)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                    types.includes(tp)
                      ? "border-brand-500 bg-brand-50 text-brand-600"
                      : "border-gray-200 bg-white text-gray-500 hover:border-brand-200"
                  }`}>
                  {ANIMAL_TYPE_LABELS[tp]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">{t("maxWeightLabel")}</label>
            <input type="number" min={0} step={0.5} value={maxWeight} onChange={e => setMaxWeight(e.target.value)}
              placeholder={t("weightPlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={canQuarantine} onChange={e => setCanQ(e.target.checked)}
              className="accent-brand-500" />
            {t("quarantineLabel")}
          </label>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">{t("motivationLabel")}</label>
            <textarea value={motivation} onChange={e => setMotivation(e.target.value)}
              rows={3} maxLength={2000} placeholder={t("motivationPlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {loading ? t("submitting") : t("submitButton")}
          </button>
        </form>
      )}
    </div>
  );
}
