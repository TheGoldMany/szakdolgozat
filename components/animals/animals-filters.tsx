"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useCallback, useState, useTransition, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SlidersHorizontal, ChevronDown, X, PawPrint, Dog, Cat, Rabbit, Bird } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnimalsFilters() {
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

  const q      = searchParams.get("q")      ?? "";
  const type   = searchParams.get("type")   ?? "";
  const size   = searchParams.get("size")   ?? "";
  const gender = searchParams.get("gender") ?? "";
  const hasFilters = !!(type || size || gender || q);

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

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 lg:hidden"
      >
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <SlidersHorizontal className="h-4 w-4 text-brand-500" />
          {t("filterLabel")}
          {hasFilters && (
            <span className="h-2 w-2 rounded-full bg-brand-500" />
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 transition-transform duration-200",
          open && "rotate-180",
        )} />
      </button>

      {/* Filter body */}
      <div className={cn(
        "space-y-5 border-t border-gray-100 p-5 lg:border-t-0",
        !open && "hidden lg:block",
      )}>
        <h2 className="hidden text-sm font-bold text-gray-800 lg:block">{t("filterLabel")}</h2>

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

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => startTransition(() => router.push(pathname))}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
