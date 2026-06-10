"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

type FormData = {
  message:     string;
  homeType:    "HOUSE" | "APARTMENT" | "OTHER";
  hasGarden:   boolean;
  hasChildren: boolean;
  hasPets:     boolean;
  experience?: string;
};

interface AdoptionFormProps {
  animalId:   string;
  animalName: string;
}

export function AdoptionForm({ animalId, animalName }: AdoptionFormProps) {
  const t = useTranslations("animals.adoptionForm");
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = z.object({
    message:     z.string().min(20, t("messageMinError")),
    homeType:    z.enum(["HOUSE", "APARTMENT", "OTHER"]),
    hasGarden:   z.boolean(),
    hasChildren: z.boolean(),
    hasPets:     z.boolean(),
    experience:  z.string().optional(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { hasGarden: false, hasChildren: false, hasPets: false },
  });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animalId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? t("unknownError"));
      return;
    }
    setSubmitted(true);
    router.refresh();
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="font-semibold text-green-800">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-green-700">
          {t("successDesc")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Motiváció */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("motivationLabel", { name: animalName })}
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        <textarea
          {...register("message")}
          rows={4}
          placeholder={t("motivationPlaceholder")}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        {errors.message && (
          <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
        )}
      </div>

      {/* Lakástípus */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("homeTypeLabel")} <span className="text-red-500">*</span>
        </label>
        <select
          {...register("homeType")}
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">{t("homeTypeChoose")}</option>
          <option value="HOUSE">{t("homeTypeHouse")}</option>
          <option value="APARTMENT">{t("homeTypeApartment")}</option>
          <option value="OTHER">{t("homeTypeOther")}</option>
        </select>
        {errors.homeType && (
          <p className="mt-1 text-xs text-red-500">{t("homeTypeRequired")}</p>
        )}
      </div>

      {/* Checkboxok */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { name: "hasGarden"   as const, label: t("hasGardenLabel") },
          { name: "hasChildren" as const, label: t("hasChildrenLabel") },
          { name: "hasPets"     as const, label: t("hasPetsLabel") },
        ].map(({ name, label }) => (
          <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50">
            <input
              type="checkbox"
              {...register(name)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      {/* Tapasztalat */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("experienceLabel")}
          <span className="ml-1 text-xs font-normal text-gray-400">{t("experienceOptional")}</span>
        </label>
        <textarea
          {...register("experience")}
          rows={3}
          placeholder={t("experiencePlaceholder")}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {isSubmitting ? t("submitting") : t("submitButton")}
      </button>
    </form>
  );
}
