"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const TYPES = [
  { value: "",       label: "Összes" },
  { value: "DOG",    label: "Kutya" },
  { value: "CAT",    label: "Macska" },
  { value: "RABBIT", label: "Nyúl" },
  { value: "BIRD",   label: "Madár" },
  { value: "OTHER",  label: "Egyéb" },
];

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [type, setType]   = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type)         params.set("type", type);
    router.push(`/animals${params.toString() ? "?" + params.toString() : ""}`);
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl">
      {/* Keresőmező */}
      <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md focus-within:ring-2 focus-within:ring-brand-500">
        <div className="flex items-center pl-4 text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keress névre, fajtára..."
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="m-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Keresés
        </button>
      </div>

      {/* Típus szűrők */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              type === t.value
                ? "bg-brand-500 text-white shadow-sm"
                : "border border-gray-200 bg-white/80 text-gray-600 hover:bg-white hover:shadow-sm"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </form>
  );
}
