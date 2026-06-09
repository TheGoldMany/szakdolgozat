"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

export function FavoritesFilter() {
  const t          = useTranslations("favorites");
  const router     = useRouter();
  const pathname   = usePathname();
  const sp         = useSearchParams();

  const type   = sp.get("type")   ?? "";
  const status = sp.get("status") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const hasFilter = type || status;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <select
        value={type}
        onChange={(e) => update("type", e.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">{t("filterAllTypes")}</option>
        <option value="DOG">{t("filterDog")}</option>
        <option value="CAT">{t("filterCat")}</option>
        <option value="RABBIT">{t("filterRabbit")}</option>
        <option value="BIRD">{t("filterBird")}</option>
        <option value="OTHER">{t("filterOther")}</option>
      </select>

      <select
        value={status}
        onChange={(e) => update("status", e.target.value)}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">{t("filterAllStatuses")}</option>
        <option value="AVAILABLE">{t("filterAvailable")}</option>
        <option value="PENDING">{t("filterPending")}</option>
        <option value="ADOPTED">{t("filterAdopted")}</option>
      </select>

      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Szűrők törlése ×
        </button>
      )}
    </div>
  );
}
