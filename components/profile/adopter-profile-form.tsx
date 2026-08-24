"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserRound, Loader2, Check } from "lucide-react";

export interface AdopterProfile {
  bio:                string;
  homeType:           string;
  hasGarden:          boolean | null;
  hasChildren:        boolean | null;
  hasPets:            boolean | null;
  adoptionExperience: string;
}

/**
 * Örökbefogadói bemutatkozás a profilon.
 *
 * Ezek a válaszok az emberre vonatkoznak, nem egy konkrét állatra – ezért a
 * profilon a helyük, nem a kérelmen. Egyszer kell megírni, és onnantól minden
 * örökbefogadási kérelembe automatikusan bekerül, a menhely pedig nemcsak egy
 * nevet lát, hanem egy embert. Ettől kevesebb oda-vissza kérdezés kell.
 */
export function AdopterProfileForm({ initial }: { initial: AdopterProfile }) {
  const t = useTranslations("profile");
  const [form, setForm]     = useState<AdopterProfile>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  function set<K extends keyof AdopterProfile>(key: K, value: AdopterProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          bio:                form.bio.trim() || null,
          homeType:           form.homeType || null,
          hasGarden:          form.hasGarden,
          hasChildren:        form.hasChildren,
          hasPets:            form.hasPets,
          adoptionExperience: form.adoptionExperience.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? t("networkError"));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  const HOUSEHOLD = [
    { key: "hasGarden"   as const, label: t("adopterHasGarden")   },
    { key: "hasChildren" as const, label: t("adopterHasChildren") },
    { key: "hasPets"     as const, label: t("adopterHasPets")     },
  ];

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">{t("adopterTitle")}</h2>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-gray-400">{t("adopterIntro")}</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="adopter-bio" className="mb-1 block text-xs font-medium text-gray-600">
            {t("adopterBio")}
          </label>
          <textarea
            id="adopter-bio"
            rows={4}
            maxLength={2000}
            value={form.bio}
            placeholder={t("adopterBioPlaceholder")}
            onChange={(e) => set("bio", e.target.value)}
            className={`${inputCls} resize-none`}
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">{form.bio.length}/2000</p>
        </div>

        <div>
          <label htmlFor="adopter-home" className="mb-1 block text-xs font-medium text-gray-600">
            {t("adopterHomeType")}
          </label>
          <select
            id="adopter-home"
            value={form.homeType}
            onChange={(e) => set("homeType", e.target.value)}
            className={inputCls}
          >
            <option value="">{t("adopterHomeChoose")}</option>
            <option value="HOUSE">{t("adopterHomeHouse")}</option>
            <option value="APARTMENT">{t("adopterHomeApartment")}</option>
            <option value="OTHER">{t("adopterHomeOther")}</option>
          </select>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {HOUSEHOLD.map(({ key, label }) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={form[key] === true}
                onChange={(e) => set(key, e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="adopter-exp" className="mb-1 block text-xs font-medium text-gray-600">
            {t("adopterExperience")}
          </label>
          <textarea
            id="adopter-exp"
            rows={3}
            maxLength={2000}
            value={form.adoptionExperience}
            placeholder={t("adopterExperiencePlaceholder")}
            onChange={(e) => set("adoptionExperience", e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? t("saving") : t("adopterSave")}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <Check className="h-3.5 w-3.5" />
            {t("adopterSaved")}
          </span>
        )}
      </div>
    </form>
  );
}
