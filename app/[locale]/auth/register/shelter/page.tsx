"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@/i18n/navigation";
import { PawPrint, Building2, BadgeCheck, Users, Heart, MailCheck } from "lucide-react";
import { shelterRegisterSchema, type ShelterRegisterInput } from "@/lib/validations/auth";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function ShelterRegisterPage() {
  const t       = useTranslations("auth");
  const tCommon = useTranslations("common");
  const [serverError, setServerError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShelterRegisterInput>({ resolver: zodResolver(shelterRegisterSchema) });

  async function onSubmit(data: ShelterRegisterInput) {
    setServerError("");
    const res = await fetch("/api/auth/register-shelter", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? t("registerError"));
      return;
    }
    setRegisteredEmail(data.email);
  }

  async function resend() {
    if (!registeredEmail) return;
    try {
      await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: registeredEmail }),
      });
      toast.success(t("resent"));
    } catch {
      toast.error(tCommon("networkError"));
    }
    setResent(true);
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500";

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
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl tracking-tight">{t("shelterBrandTitle")}</h2>
          <p className="mt-3 text-base text-white/80">
            {t("shelterBrandDesc")}
          </p>

          <div className="mt-10 space-y-4 text-left">
            {[
              { icon: Heart,      title: t("shelterPerk1Title"), desc: t("shelterPerk1Desc") },
              { icon: Users,      title: t("shelterPerk2Title"), desc: t("shelterPerk2Desc") },
              { icon: BadgeCheck, title: t("shelterPerk3Title"), desc: t("shelterPerk3Desc") },
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
        <div className="w-full max-w-lg">
          {/* Mobile-only logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-500">
              <PawPrint className="h-6 w-6" />
              ÁllatiMenhelyek.hu
            </Link>
          </div>

          {registeredEmail ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
              <MailCheck className="mx-auto mb-4 h-12 w-12 text-brand-500" />
              <h2 className="text-xl font-bold text-gray-900">{t("shelterVerifyTitle")}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {t("shelterVerifyDesc", { email: registeredEmail })}
              </p>
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm text-blue-800">
                {t("shelterVerifyNote")}
              </div>
              <div className="mt-6 space-y-3">
                {resent ? (
                  <p className="text-sm font-medium text-green-600">{t("resent")}</p>
                ) : (
                  <button type="button" onClick={resend} className="text-sm font-semibold text-brand-600 hover:underline">
                    {t("resend")}
                  </button>
                )}
                <div>
                  <Link href="/auth/login" className="text-sm text-gray-400 hover:text-brand-600 transition-colors">
                    {t("loginButton")}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{t("shelterFormTitle")}</h1>
                <p className="mt-1.5 text-sm text-gray-500">
                  {t("shelterFormDesc")}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Menhely adatok */}
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("shelterSection")}</p>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("shelterName")}</label>
                    <input placeholder={t("shelterNamePlaceholder")} className={inputCls} {...register("shelterName")} />
                    {errors.shelterName && <p className="mt-1 text-xs text-red-500">{errors.shelterName.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("city")}</label>
                      <input placeholder={t("cityPlaceholder")} className={inputCls} {...register("city")} />
                      {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("zipCode")}</label>
                      <input placeholder="1111" className={inputCls} {...register("zipCode")} />
                      {errors.zipCode && <p className="mt-1 text-xs text-red-500">{errors.zipCode.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("address")}</label>
                    <input placeholder={t("addressPlaceholder")} className={inputCls} {...register("address")} />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("phone")} <span className="text-gray-400">({tCommon("optional")})</span></label>
                      <input placeholder="+36 30 123 4567" className={inputCls} {...register("phone")} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("shelterEmail")} <span className="text-gray-400">({tCommon("optional")})</span></label>
                      <input type="email" placeholder="info@menhely.hu" className={inputCls} {...register("shelterEmail")} />
                      {errors.shelterEmail && <p className="mt-1 text-xs text-red-500">{errors.shelterEmail.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("shelterDescription")} <span className="text-gray-400">({tCommon("optional")})</span></label>
                    <textarea rows={3} placeholder={t("shelterDescriptionPlaceholder")} className={inputCls} {...register("description")} />
                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                  </div>

                  {/* Admin fiók */}
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("adminSection")}</p>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("fullName")}</label>
                    <input autoComplete="name" placeholder="Kovács Anna" className={inputCls} {...register("adminName")} />
                    {errors.adminName && <p className="mt-1 text-xs text-red-500">{errors.adminName.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("emailLabel")}</label>
                    <input type="email" autoComplete="email" placeholder="anna@menhely.hu" className={inputCls} {...register("email")} />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("passwordLabel")}</label>
                      <input type="password" autoComplete="new-password" placeholder={t("passwordPlaceholder")} className={inputCls} {...register("password")} />
                      {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("passwordAgain")}</label>
                      <input type="password" autoComplete="new-password" placeholder="••••••••" className={inputCls} {...register("confirmPassword")} />
                      {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                    </div>
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
                    {isSubmitting ? t("registering") : t("shelterSubmit")}
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    {t("asIndividual")}{" "}
                    <Link href="/auth/register" className="font-semibold text-brand-500 hover:underline">
                      {t("plainRegister")}
                    </Link>
                  </p>
                </form>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
              {tCommon("backHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
