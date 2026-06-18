"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const schema = z.object({
  name:    z.string().min(2),
  phone:   z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  city:    z.string().max(100).optional(),
});

type FormData = z.infer<typeof schema>;

interface ProfileFormProps {
  user: {
    name:    string | null;
    phone:   string | null;
    address: string | null;
    city:    string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("profile");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:    user.name    ?? "",
      phone:   user.phone   ?? "",
      address: user.address ?? "",
      city:    user.city    ?? "",
    },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? t("networkError"));
      return;
    }
    toast.success(t("profileSaved"));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Név */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("fullName")} <span className="text-red-500">*</span>
        </label>
        <input
          {...register("name")}
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{t("nameMinError")}</p>
        )}
      </div>

      {/* Telefon */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("phone")}</label>
        <input
          {...register("phone")}
          placeholder="+36 30 123 4567"
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Város */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("city")}</label>
        <input
          {...register("city")}
          placeholder="Budapest"
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Cím */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("address")}</label>
        <input
          {...register("address")}
          placeholder="Példa utca 1."
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? t("saving") : t("saveProfile")}
      </button>
    </form>
  );
}
