import Link from "next/link";
import { useTranslations } from "next-intl";
import { PawPrint, Home, Search } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-100">
          <PawPrint className="h-10 w-10 text-brand-600" />
        </div>
        <p className="text-6xl font-black text-brand-200">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          {t("notFoundDesc")}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            <Home className="h-4 w-4" /> {t("backHome")}
          </Link>
          <Link
            href="/animals"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Search className="h-4 w-4" /> {t("browseAnimals")}
          </Link>
        </div>
      </div>
    </div>
  );
}
