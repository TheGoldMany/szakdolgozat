"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PawPrint, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

function UnsubscribedInner() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  const isOk      = status === "ok";
  const isInvalid = status === "invalid";

  return (
    <div className="w-full max-w-md text-center">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xl font-bold text-brand-600">
        <PawPrint className="h-6 w-6" />
        ÁllatiMenhelyek.hu
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {isOk ? (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-gray-900">{t("unsubscribedTitle")}</h1>
            <p className="mt-2 text-sm text-gray-500">{t("unsubscribedDesc")}</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900">
              {isInvalid ? t("unsubscribeInvalidTitle") : t("unsubscribeErrorTitle")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {isInvalid ? t("unsubscribeInvalidDesc") : t("unsubscribeErrorDesc")}
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-6 inline-block rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t("backToHome")}
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-brand-500" />}>
        <UnsubscribedInner />
      </Suspense>
    </div>
  );
}
