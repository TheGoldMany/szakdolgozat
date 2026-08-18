import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Clock, PawPrint, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("title"),
    description: t("desc"),
  };
}

export default async function KapcsolatPage() {
  const t = await getTranslations("contact");

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 text-center">
          <h1 className="text-4xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-3 text-lg text-gray-500">
            {t("desc")}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

          {/* Email */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Mail className="h-5 w-5 text-brand-600" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-800">{t("email")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("emailDesc")}
            </p>
            <a
              href="mailto:info@allatimenhelyek.hu"
              className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
            >
              info@allatimenhelyek.hu
            </a>
          </div>

          {/* Válaszidő */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <Clock className="h-5 w-5 text-brand-600" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-800">{t("responseTime")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("responseTimeDesc")}
            </p>
            <p className="mt-3 text-sm font-medium text-gray-700">{t("workingHours")}</p>
          </div>

          {/* Székhely */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <MapPin className="h-5 w-5 text-brand-600" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-800">{t("location")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("locationValue")}
            </p>
          </div>

          {/* Útmutató */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
              <PawPrint className="h-5 w-5 text-brand-600" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-gray-800">{t("guide")}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("guideDesc")}
            </p>
            <Link
              href="/sugo"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              {t("openGuide")} <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>

        {/* Menhely regisztráció */}
        <div className="mt-8 rounded-2xl bg-brand-600 p-8 text-white">
          <h2 className="text-xl font-bold">{t("shelterTitle")}</h2>
          <p className="mt-2 text-sm text-brand-100 leading-relaxed">
            {t("shelterDesc")}
          </p>
          <a
            href="mailto:info@allatimenhelyek.hu?subject=Menhely regisztráció"
            className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
          >
            {t("shelterCta")}
          </a>
        </div>

      </div>
    </div>
  );
}
