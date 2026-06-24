"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookie-consent";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept(value: "all" | "necessary") {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 shadow-2xl backdrop-blur-sm sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm sm:rounded-2xl sm:border"
    >
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Cookie className="h-5 w-5 shrink-0 text-brand-500" />
          <p className="text-sm font-semibold text-gray-900">{t("title")}</p>
        </div>
        <p className="text-xs leading-relaxed text-gray-500">{t("description")}{" "}
          <Link href="/adatvedelem#cookie" className="underline text-brand-700 underline-offset-2 hover:text-brand-800">
            {t("learnMore")}
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => accept("all")}
            className="flex-1 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
          >
            {t("acceptAll")}
          </button>
          <button
            type="button"
            onClick={() => accept("necessary")}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t("necessaryOnly")}
          </button>
        </div>
      </div>
    </div>
  );
}
