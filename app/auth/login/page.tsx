"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { PawPrint } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (res?.error) {
      setServerError("Hibás email cím vagy jelszó.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Email cím
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
          Jelszó
        </label>
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
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
        {isSubmitting ? "Bejelentkezés..." : "Bejelentkezés"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Még nincs fiókod?{" "}
        <Link href="/auth/register" className="font-semibold text-brand-500 hover:underline">
          Regisztrálj ingyen
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div className="relative hidden overflow-hidden bg-brand-500 lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {/* Decorative paw prints */}
        {[
          { top: "8%",  left: "12%", size: 56, rotate: -20, opacity: 0.12 },
          { top: "18%", left: "68%", size: 40, rotate:  30, opacity: 0.10 },
          { top: "42%", left: "5%",  size: 32, rotate: -10, opacity: 0.08 },
          { top: "60%", left: "75%", size: 48, rotate:  15, opacity: 0.12 },
          { top: "78%", left: "30%", size: 36, rotate: -25, opacity: 0.09 },
          { top: "88%", left: "80%", size: 28, rotate:  40, opacity: 0.07 },
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
          <h2 className="text-3xl font-bold tracking-tight">ÁllatiMenhelyek.hu</h2>
          <p className="mt-3 text-base text-white/80">Találd meg leendő kisállatodat</p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: "12+",  label: "Menhely" },
              { value: "200+", label: "Állat" },
              { value: "50+",  label: "Örökbefogadás" },
            ].map(({ value, label }) => (
              <div key={label} className="rounded-2xl bg-white/15 px-4 py-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{value}</div>
                <div className="mt-0.5 text-xs text-white/70">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-3 text-sm text-white/80">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
              Ingyenes regisztráció
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
              Közvetlen kapcsolat a menhelyekkel
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
              Elveszett állat bejelentése
            </div>
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
            <h1 className="text-2xl font-bold text-gray-900">Üdvözlünk vissza!</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Jelentkezz be a fiókodba a folytatáshoz.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100" />}>
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
              ← Vissza a főoldalra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
