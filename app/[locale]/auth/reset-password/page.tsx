"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PawPrint, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

function ResetForm() {
  const t           = useTranslations("auth");
  const router      = useRouter();
  const searchParams = useSearchParams();
  const token       = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-red-600">{t("resetInvalidLink")}</p>
        <Link href="/auth/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
          {t("resetNewLinkRequest")}
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("resetPasswordsMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("resetPasswordTooShort"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("resetGenericError"));
        return;
      }
      toast.success(t("resetSuccessTitle"));
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-7 w-7 text-brand-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{t("resetSuccessTitle")}</h2>
        <p className="mt-2 text-sm text-gray-500">{t("resetSuccessDesc")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{t("resetTitle")}</h1>
        <p className="mt-1.5 text-sm text-gray-500">{t("resetDesc")}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("resetNewPasswordLabel")}</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("resetPasswordPlaceholder")}
              required
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("confirmPassword")}</label>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("resetConfirmPlaceholder")}
            required
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {loading ? t("resetSaving") : t("resetSaveButton")}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-600">
            <PawPrint className="h-6 w-6" />
            ÁllatiMenhelyek.hu
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-gray-100" />}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
