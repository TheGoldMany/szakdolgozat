"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { PawPrint, ArrowLeft, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-600">
            <PawPrint className="h-6 w-6" />
            ÁllatiMenhelyek.hu
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
                <Mail className="h-7 w-7 text-brand-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{t("forgotSentTitle")}</h1>
              <p className="mt-2 text-sm text-gray-500">
                {t.rich("forgotSentDesc", {
                  email,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
              <Link
                href="/auth/login"
                className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                {t("forgotBackToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">{t("forgotTitle")}</h1>
                <p className="mt-1.5 text-sm text-gray-500">
                  {t("forgotDesc")}
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("emailLabel")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pelda@email.hu"
                    required
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                >
                  {loading ? t("forgotSending") : t("forgotSendLink")}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("forgotBackToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
