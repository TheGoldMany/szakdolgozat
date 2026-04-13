"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const TYPES = [
  { value: "", label: "Minden állat" },
  { value: "DOG",    label: "🐕 Kutya" },
  { value: "CAT",    label: "🐈 Macska" },
  { value: "RABBIT", label: "🐇 Nyúl" },
  { value: "BIRD",   label: "🦜 Madár" },
  { value: "OTHER",  label: "🐾 Egyéb" },
];

const SIZES = [
  { value: "", label: "Bármilyen méret" },
  { value: "SMALL",       label: "Kis" },
  { value: "MEDIUM",      label: "Közepes" },
  { value: "LARGE",       label: "Nagy" },
  { value: "EXTRA_LARGE", label: "Extra nagy" },
];

const GENDERS = [
  { value: "",       label: "Mindkét nem" },
  { value: "MALE",   label: "♂ Hím" },
  { value: "FEMALE", label: "♀ Nőstény" },
];

export function AnimalsFilters() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/animals?${params.toString()}`);
  }, [router, searchParams]);

  const q      = searchParams.get("q") ?? "";
  const type   = searchParams.get("type") ?? "";
  const size   = searchParams.get("size") ?? "";
  const gender = searchParams.get("gender") ?? "";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
      <h2 className="font-semibold text-gray-800">Szűrők</h2>

      {/* Keresés */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Keresés</label>
        <input
          type="search"
          placeholder="Név, fajta..."
          defaultValue={q}
          onChange={(e) => update("q", e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Faj */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Állatfaj</label>
        <div className="flex flex-col gap-1">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => update("type", t.value)}
              className={`rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                type === t.value
                  ? "bg-brand-500 text-white font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Méret */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Méret</label>
        <select
          value={size}
          onChange={(e) => update("size", e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Nem */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-600">Nem</label>
        <select
          value={gender}
          onChange={(e) => update("gender", e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Reset */}
      {(type || size || gender || q) && (
        <button
          onClick={() => router.push("/animals")}
          className="w-full rounded-lg border border-gray-200 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
        >
          Szűrők törlése
        </button>
      )}
    </div>
  );
}
