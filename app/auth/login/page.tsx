"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-500">
            ÁllatiMenhelyek.hu
          </Link>
          <p className="mt-2 text-sm text-gray-600">Jelentkezz be a fiókodba</p>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold text-gray-900">Bejelentkezés</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Email cím"
                placeholder="pelda@email.hu"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                id="password"
                type="password"
                label="Jelszó"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register("password")}
              />

              {serverError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {serverError}
                </p>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full">
                Bejelentkezés
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Még nincs fiókod?{" "}
              <Link href="/auth/register" className="font-medium text-brand-500 hover:underline">
                Regisztrálj
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
