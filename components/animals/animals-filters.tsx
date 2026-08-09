"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useCallback, useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, X, PawPrint, Dog, Cat, Rabbit, Bird, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnimalsFilters({ cities = [] }: { cities?: string[] }) {
  const t = useTranslations("animals");
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const TYPES: { value: string; label: string; Icon?: React.ElementType }[] = [
    { value: "",       label: t("filterAllTypes") },
    { value: "DOG",    label: t("dog"),    Icon: Dog    },
    { value: "CAT",    label: t("cat"),    Icon: Cat    },
    { value: "RABBIT", label: t("rabbit"), Icon: Rabbit },
    { value: "BIRD",   label: t("bird"),   Icon: Bird   },
    { value: "OTHER",  label: t("other"),  Icon: PawPrint },
  ];

  const SIZES = [
    { value: "",            label: t("filterAnySize") },
    { value: "SMALL",       label: t("small")         },
    { value: "MEDIUM",      label: t("medium")        },
    { value: "LARGE",       label: t("large")         },
    { value: "EXTRA_LARGE", label: t("extraLarge")    },
  ];

  const GENDERS = [
    { value: "",       label: t("filterBothGenders") },
    { value: "MALE",   label: t("male")              },
    { value: "FEMALE", label: t("female")            },
  ];

  const PROPS: { key: string; label: string }[] = [
    { key: "vaccinated",   label: t("propVaccinated")   },
    { key: "neutered",     label: t("propNeutered")     },
    { key: "goodWithKids", label: t("propGoodWithKids") },
    { key: "goodWithDogs", label: t("propGoodWithDogs") },
    { key: "goodWithCats", label: t("propGoodWithCats") },
  ];

  const q      = searchParams.get("q")      ?? "";
  const type   = searchParams.get("type")   ?? "";
  const size   = searchParams.get("size")   ?? "";
  const gender = searchParams.get("gender") ?? "";
  const city   = searchParams.get("city")   ?? "";
  const activeProps = PROPS.filter((p) => searchParams.get(p.key) === "1").map((p) => p.key);
  const hasFilters = !!(type || size || gender || q || city || activeProps.length);

  // Local search state with debounce so typing is smooth
  const [localQ, setLocalQ] = useState(q);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Sync search input when filters are cleared from outside (URL q → "")
  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  }, [router, pathname, searchParams]);

  function handleSearchChange(value: string) {
    setLocalQ(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update("q", value), 400);
  }

  const toggleProp = useCallback((key: string) => {
    update(key, searchParams.get(key) === "1" ? "" : "1");
  }, [update, searchParams]);

  const activeCount = (type ? 1 : 0) + (size ? 1 : 0) + (gender ? 1 : 0) + (q ? 1 : 0) + (city ? 1 : 0) + activeProps.length;

  // Görgetés-zár, amíg a mobil szűrő-lap nyitva van
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const clearButton = (
    <button
      onClick={() => startTransition(() => router.push(pathname))}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
    >
      <X className="h-3.5 w-3.5" />
      {t("clearFilters")}
    </button>
  );

  // A tényleges szűrő-vezérlők (desktop oldalsávban és mobil lapon is ezt használjuk)
  const controls = (
    <>
        {/* Search */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("filterSearchLabel")}
          </label>
          <input
            type="search"
            placeholder={t("filterSearchPlaceholder")}
            value={localQ}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("filterSpeciesLabel")}
          </label>
          <div className="flex flex-col gap-1">
            {TYPES.map((item) => (
              <button
                key={item.value}
                onClick={() => update("type", item.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                  type === item.value
                    ? "bg-brand-500 text-white"
                    : "text-gray-700 hover:bg-gray-50",
                )}
              >
                {item.Icon && <item.Icon className="h-4 w-4 shrink-0" />}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("filterSizeLabel")}
          </label>
          <select
            value={size}
            onChange={(e) => update("size", e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Gender */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("filterGenderLabel")}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => update("gender", g.value)}
                className={cn(
                  "rounded-xl px-2 py-2 text-center text-xs font-medium transition-colors",
                  gender === g.value
                    ? "bg-brand-500 text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Area (city) */}
        {cities.length > 0 && (
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <MapPin className="h-3.5 w-3.5" />
              {t("filterAreaLabel")}
            </label>
            <select
              value={city}
              onChange={(e) => update("city", e.target.value)}
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">{t("filterAllAreas")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Properties */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t("filterPropsLabel")}
          </label>
          <div className="flex flex-col gap-1.5">
            {PROPS.map((p) => {
              const active = activeProps.includes(p.key);
              return (
                <label
                  key={p.key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-brand-300 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleProp(p.key)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500"
                  />
                  {p.label}
                </label>
              );
            })}
          </div>
        </div>
    </>
  );

  return (
    <>
      {/* ── Desktop: oldalsáv (lg+) ─────────────────────────── */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:block">
        <div className="space-y-5 p-5">
          <h2 className="text-sm font-bold text-gray-800">{t("filterLabel")}</h2>
          {controls}
          {hasFilters && clearButton}
        </div>
      </div>

      {/* ── Mobil: „Szűrők" gomb (lg alatt) ─────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm lg:hidden"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-800">
          <SlidersHorizontal className="h-4 w-4 text-brand-500" />
          {t("filterLabel")}
        </span>
        {activeCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-500 px-2 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Mobil: alulról felcsúszó szűrő-lap ───────────────── */}
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-2xl">
            {/* Fejléc */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <SlidersHorizontal className="h-4 w-4 text-brand-500" />
                {t("filterLabel")}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("clearFilters")}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Görgethető törzs */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {controls}
            </div>

            {/* Lábléc */}
            <div
              className="flex gap-3 border-t border-gray-100 p-4"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              {hasFilters && (
                <button
                  onClick={() => startTransition(() => router.push(pathname))}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  {t("clearFilters")}
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {t("showResults")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
