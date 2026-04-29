"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "",       label: "Minden állat" },
  { value: "DOG",    label: "🐕 Kutya"     },
  { value: "CAT",    label: "🐈 Macska"    },
  { value: "RABBIT", label: "🐇 Nyúl"      },
  { value: "BIRD",   label: "🐦 Madár"     },
  { value: "OTHER",  label: "🐾 Egyéb"     },
];

const SIZES = [
  { value: "",            label: "Bármilyen méret" },
  { value: "SMALL",       label: "Kis"             },
  { value: "MEDIUM",      label: "Közepes"         },
  { value: "LARGE",       label: "Nagy"            },
  { value: "EXTRA_LARGE", label: "Extra nagy"      },
];

const GENDERS = [
  { value: "",       label: "Mindkettő" },
  { value: "MALE",   label: "Hím"       },
  { value: "FEMALE", label: "Nőstény"   },
];

export function AnimalsFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/animals?${params.toString()}`);
  }, [router, searchParams]);

  const q      = searchParams.get("q")      ?? "";
  const type   = searchParams.get("type")   ?? "";
  const size   = searchParams.get("size")   ?? "";
  const gender = searchParams.get("gender") ?? "";

  const hasFilters = !!(type || size || gender || q);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-4 lg:hidden"
      >
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <SlidersHorizontal className="h-4 w-4 text-brand-500" />
          Szűrők
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
        <h2 className="hidden text-sm font-bold text-gray-800 lg:block">Szűrők</h2>

        {/* Search */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Keresés
          </label>
          <input
            type="search"
            placeholder="Név, fajta..."
            defaultValue={q}
            onChange={(e) => update("q", e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Állatfaj
          </label>
          <div className="flex flex-col gap-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => update("type", t.value)}
                className={cn(
                  "rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                  type === t.value
                    ? "bg-brand-500 text-white"
                    : "text-gray-700 hover:bg-gray-50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
            Méret
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
            Nem
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
            onClick={() => router.push("/animals")}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
            Szűrők törlése
          </button>
        )}
      </div>
    </div>
  );
}
