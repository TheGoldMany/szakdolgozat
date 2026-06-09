"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PawPrint, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type Status = "loading" | "success" | "error";

function VerifyEmailInner() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("verifyFailDesc"));
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error ?? t("verifyFailDesc"));
        }
      } catch {
        setStatus("error");
        setMessage(t("verifyFailDesc"));
      }
    })();
  }, [token, t]);

  return (
    <div className="w-full max-w-md text-center">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xl font-bold text-brand-600">
        <PawPrint className="h-6 w-6" />
        ÁllatiMenhelyek.hu
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-brand-500" />
            <h1 className="text-xl font-bold text-gray-900">{t("verifyingTitle")}</h1>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h1 className="text-xl font-bold text-gray-900">{t("verifySuccessTitle")}</h1>
            <p className="mt-2 text-sm text-gray-500">{t("verifySuccessDesc")}</p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {t("verifyGoLogin")}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h1 className="text-xl font-bold text-gray-900">{t("verifyFailTitle")}</h1>
            <p className="mt-2 text-sm text-gray-500">{message || t("verifyFailDesc")}</p>
            <Link
              href="/auth/login"
              className="mt-6 inline-block rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t("verifyGoLogin")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-brand-500" />}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
