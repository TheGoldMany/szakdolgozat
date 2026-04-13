"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

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
      setServerError(json.error ?? "Hiba történt a regisztráció során.");
      return;
    }

    // Automatikus bejelentkezés regisztráció után
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-brand-500">
            ÁllatiMenhelyek.hu
          </Link>
          <p className="mt-2 text-sm text-gray-600">Hozz létre egy új fiókot</p>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold text-gray-900">Regisztráció</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                id="name"
                label="Teljes név"
                placeholder="Kovács János"
                autoComplete="name"
                error={errors.name?.message}
                {...register("name")}
              />
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
                placeholder="Min. 8 karakter, nagybetű és szám"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Jelszó megerősítése"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              {serverError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {serverError}
                </p>
              )}

              <Button type="submit" loading={isSubmitting} className="w-full">
                Regisztráció
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              Már van fiókod?{" "}
              <Link href="/auth/login" className="font-medium text-brand-500 hover:underline">
                Jelentkezz be
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
