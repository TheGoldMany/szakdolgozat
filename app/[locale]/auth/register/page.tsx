"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PawPrint, Heart, Shield, Bell, MailCheck } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t           = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [serverError, setServerError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setServerError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? t("registerErrorGeneric"));
      return;
    }

    // Megerősítő emailt küldtünk – nincs automatikus bejelentkezés
    setRegisteredEmail(data.email);
  }

  async function resend() {
    if (!registeredEmail) return;
    await fetch("/api/auth/resend-verification", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: registeredEmail }),
    });
    setResent(true);
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div className="relative hidden overflow-hidden bg-brand-500 lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {[
          { top: "5%",  left: "10%", size: 52, rotate: -15, opacity: 0.12 },
          { top: "20%", left: "72%", size: 36, rotate:  25, opacity: 0.10 },
          { top: "50%", left: "3%",  size: 44, rotate: -30, opacity: 0.09 },
          { top: "65%", left: "78%", size: 32, rotate:  10, opacity: 0.11 },
          { top: "82%", left: "40%", size: 40, rotate: -20, opacity: 0.08 },
        ].map((p, i) => (
          <PawPrint
            key={i}
            className="absolute text-white"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, transform: `rotate(${p.rotate}deg)`, opacity: p.opacity }}
          />
        ))}

        <div className="relative z-10 text-center text-white">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-xl">
            <PawPrint className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{t("joinTitle")}</h2>
          <p className="mt-3 text-base text-white/80">
            {t("joinSubtitle")}
          </p>

          <div className="mt-10 space-y-4 text-left">
            {[
              { icon: Heart,  title: t("feature1Title"), desc: t("feature1Desc") },
              { icon: Bell,   title: t("feature2Title"), desc: t("feature2Desc") },
              { icon: Shield, title: t("feature3Title"), desc: t("feature3Desc") },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-white/70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-500">
              <PawPrint className="h-6 w-6" />
              ÁllatiMenhelyek.hu
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t("createAccountTitle")}</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("createAccountDesc")}
            </p>
          </div>

          {registeredEmail ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
              <MailCheck className="mx-auto mb-4 h-12 w-12 text-brand-500" />
              <h2 className="text-xl font-bold text-gray-900">{t("verifyEmailSentTitle")}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {t("verifyEmailSentDesc", { email: registeredEmail })}
              </p>
              <div className="mt-6 space-y-3">
                {resent ? (
                  <p className="text-sm font-medium text-green-600">{t("verifyResent")}</p>
                ) : (
                  <button
                    type="button"
                    onClick={resend}
                    className="text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {t("verifyResend")}
                  </button>
                )}
                <div>
                  <Link
                    href={callbackUrl !== "/" ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/login"}
                    className="text-sm text-gray-400 hover:text-brand-600 transition-colors"
                  >
                    {t("signInLink")}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("fullName")}
                </label>
                <input
                  placeholder="Kovács János"
                  autoComplete="name"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("emailLabel")}
                </label>
                <input
                  type="email"
                  placeholder="pelda@email.hu"
                  autoComplete="email"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("password")}
                </label>
                <input
                  type="password"
                  placeholder={t("passwordMinHint")}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t("confirmPassword")}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {isSubmitting ? t("registering") : t("createAccountButton")}
              </button>

              <p className="text-center text-sm text-gray-500">
                {t("hasAccountText")}{" "}
                <Link
                  href={callbackUrl !== "/" ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/login"}
                  className="font-semibold text-brand-500 hover:underline"
                >
                  {t("signInLink")}
                </Link>
              </p>
            </form>
          </div>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
