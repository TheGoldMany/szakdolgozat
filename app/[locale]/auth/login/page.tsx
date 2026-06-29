"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@/i18n/navigation";
import { PawPrint, CheckCircle2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

// ── Google icon ──────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Facebook icon ────────────────────────────────────────
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ── Divider ──────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-xs text-gray-400">{label}</span>
      </div>
    </div>
  );
}

// ── Login form ───────────────────────────────────────────
function LoginForm() {
  const t = useTranslations("auth");
  const router      = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlError    = searchParams.get("error");

  const OAUTH_ERRORS: Record<string, string> = {
    Configuration:        t("oauthErrorConfiguration"),
    OAuthAccountNotLinked: t("oauthErrorAccountLinked"),
    OAuthCallback:        t("oauthErrorCallback"),
    OAuthSignin:          t("oauthErrorSignin"),
    Callback:             t("oauthErrorCallback"),
    Default:              t("oauthErrorDefault"),
  };

  const [serverError, setServerError] = useState(
    urlError ? (OAUTH_ERRORS[urlError] ?? OAUTH_ERRORS.Default) : ""
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    setUnverifiedEmail(null);
    setResent(false);
    const res = await signIn("credentials", {
      email:      data.email,
      password:   data.password,
      rememberMe: data.rememberMe ? "true" : "false",
      redirect:   false,
    });
    if (res?.error) {
      if (res.error.includes("EMAIL_NOT_VERIFIED")) {
        setUnverifiedEmail(data.email);
        setServerError(t("loginErrorUnverified"));
      } else {
        setServerError(t("loginErrorCredentials"));
      }
      return;
    }
    // Admin szerepkör + nincs explicit cél → irány a dashboard (új menhelyek itt kapják a bemutatót)
    let dest = callbackUrl;
    if (callbackUrl === "/") {
      const session = await getSession();
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (role === "SHELTER_ADMIN" || role === "SUPER_ADMIN") dest = "/dashboard";
    }
    router.push(dest);
    router.refresh();
  }

  async function resendVerification() {
    if (!unverifiedEmail) return;
    try {
      await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: unverifiedEmail }),
      });
      toast.success(t("verifyResent"));
    } catch {
      toast.error(t("networkError"));
    }
    setResent(true);
  }

  return (
    <div className="space-y-4">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
          {unverifiedEmail && (
            <div className="mt-2">
              {resent ? (
                <span className="font-medium text-green-700">{t("verifyResent")}</span>
              ) : (
                <button
                  type="button"
                  onClick={resendVerification}
                  className="font-semibold text-brand-600 hover:underline"
                >
                  {t("verifyResend")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* OAuth gombok */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <GoogleIcon />
          Google
        </button>
        <button
          type="button"
          onClick={() => signIn("facebook", { callbackUrl })}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <FacebookIcon />
          Facebook
        </button>
      </div>

      <Divider label={t("orWithEmail")} />

      {/* Credentials form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("emailLabel")}</label>
          <input
            type="email"
            placeholder="pelda@email.hu"
            autoComplete="email"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{t("password")}</label>
            <Link href="/auth/forgot-password"
              className="text-xs text-gray-400 hover:text-brand-600 transition-colors">
              {t("forgotPassword")}
            </Link>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
            {...register("password")}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="rememberMe"
            {...register("rememberMe")}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-500 accent-brand-500 focus:ring-brand-500"
          />
          <label htmlFor="rememberMe" className="cursor-pointer select-none text-sm text-gray-600">
            {t("rememberMe")}
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {isSubmitting ? t("signingIn") : t("loginButton")}
        </button>

        <p className="text-center text-sm text-gray-500">
          {t("noAccountText")}{" "}
          <Link
            href={callbackUrl !== "/" ? `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/auth/register"}
            className="font-semibold text-brand-600 hover:underline"
          >
            {t("registerFreeLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <div className="flex min-h-screen">
      {/* Bal panel */}
      <div className="relative hidden overflow-hidden bg-brand-600 lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {[
          { top: "8%",  left: "12%", size: 56, rotate: -20, opacity: 0.12 },
          { top: "18%", left: "68%", size: 40, rotate:  30, opacity: 0.10 },
          { top: "42%", left: "5%",  size: 32, rotate: -10, opacity: 0.08 },
          { top: "60%", left: "75%", size: 48, rotate:  15, opacity: 0.12 },
          { top: "78%", left: "30%", size: 36, rotate: -25, opacity: 0.09 },
          { top: "88%", left: "80%", size: 28, rotate:  40, opacity: 0.07 },
        ].map((p, i) => (
          <PawPrint key={i} className="absolute text-white"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size,
              transform: `rotate(${p.rotate}deg)`, opacity: p.opacity }} />
        ))}

        <div className="relative z-10 text-center text-white">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-xl">
            <PawPrint className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">ÁllatiMenhelyek.hu</h2>
          <p className="mt-3 text-base text-white/80">{t("loginSubtitle")}</p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: "500+",   label: t("loginStatShelters") },
              { value: "7 000+", label: t("loginStatAnimals")  },
              { value: "500+",   label: t("loginStatAdoptions") },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-2xl bg-white/15 px-4 py-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{value}</div>
                <div className="mt-0.5 text-xs text-white/70">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-3 text-sm text-white/80">
            {[t("featureFree"), t("featureContact"), t("featureLost")].map((text) => (
              <div key={text} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-white/60" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Jobb panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-600">
              <PawPrint className="h-6 w-6" />
              ÁllatiMenhelyek.hu
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t("welcomeBackTitle")}</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("welcomeBackDesc")}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100" />}>
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-brand-600 transition-colors">
              {t("backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
