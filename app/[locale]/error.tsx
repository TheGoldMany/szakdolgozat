"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PawPrint, Home, RotateCcw } from "lucide-react";

/**
 * Hibaoldal egy oldal renderelési hibájára.
 *
 * Enélkül a Next saját, angol nyelvű képernyője jelent meg („Application
 * error: a client-side exception has occurred”), ami a látogatónak semmit nem
 * mond, és kiút sincs belőle. A technikai részletet nem írjuk ki: az a
 * naplóba való (a `digest` alapján a szervernaplóban visszakereshető).
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("[page error]", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100">
          <PawPrint className="h-10 w-10 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t("errorPageTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{t("errorPageDesc")}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <RotateCcw className="h-4 w-4" /> {t("errorPageRetry")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Home className="h-4 w-4" /> {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
