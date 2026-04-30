"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

export function HomeSearch() {
  const tHome  = useTranslations("home");
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/animals${params.toString() ? "?" + params.toString() : ""}`);
  }

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
        <div className="flex items-center pl-4 text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tHome("searchPlaceholder")}
          className="flex-1 bg-transparent px-3 py-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="m-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          {tHome("search")}
        </button>
      </div>
    </form>
  );
}
