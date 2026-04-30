"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Search, Dog, Cat, Rabbit, Bird, PawPrint } from "lucide-react";

export function HomeSearch() {
  const t      = useTranslations("animals");
  const tHome  = useTranslations("home");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [type, setType]   = useState("");

  const TYPES = [
    { value: "",       label: t("filterAllTypes"), Icon: null       },
    { value: "DOG",    label: t("dog"),            Icon: Dog        },
    { value: "CAT",    label: t("cat"),            Icon: Cat        },
    { value: "RABBIT", label: t("rabbit"),         Icon: Rabbit     },
    { value: "BIRD",   label: t("bird"),           Icon: Bird       },
    { value: "OTHER",  label: t("other"),          Icon: PawPrint   },
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type)         params.set("type", type);
    router.push(`/animals${params.toString() ? "?" + params.toString() : ""}`);
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl">
      <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md focus-within:ring-2 focus-within:ring-brand-500">
        <div className="flex items-center pl-4 text-gray-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tHome("searchPlaceholder")}
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="m-1.5 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          {tHome("search")}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setType(item.value)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              type === item.value
                ? "bg-brand-500 text-white shadow-sm"
                : "border border-gray-200 bg-white/80 text-gray-600 hover:bg-white hover:shadow-sm"
            }`}
          >
            {item.Icon && <item.Icon className="h-3.5 w-3.5 shrink-0" />}
            {item.label}
          </button>
        ))}
      </div>
    </form>
  );
}
