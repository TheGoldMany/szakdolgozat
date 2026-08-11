"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { MultiDocumentUpload, type DocItem } from "@/components/ui/multi-document-upload";

function makeSchema(t: (key: string) => string) {
  return z.object({
    name:           z.string().min(1, t("animalsFormErrorRequired")),
    type:           z.enum(["DOG", "CAT", "RABBIT", "BIRD", "OTHER"]),
    breed:          z.string().optional(),
    ageMonths:      z.coerce.number().int().min(0).optional().nullable(),
    size:           z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]).optional().nullable(),
    gender:         z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional().nullable(),
    color:          z.string().optional(),
    weight:         z.coerce.number().positive().optional().nullable(),
    description:    z.string().optional(),
    isVaccinated:   z.boolean().default(false),
    isNeutered:     z.boolean().default(false),
    isMicrochipped: z.boolean().default(false),
    isGoodWithKids: z.boolean().nullable().optional(),
    isGoodWithDogs: z.boolean().nullable().optional(),
    isGoodWithCats: z.boolean().nullable().optional(),
    imageUrls:      z.array(z.string()).optional(),
    documents:      z.array(z.object({
      url:       z.string(),
      name:      z.string(),
      fileType:  z.string(),
      sizeBytes: z.number(),
    })).optional(),
  }).superRefine((data, ctx) => {
    if (data.type === "OTHER" && !data.breed?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["breed"],
        message: t("animalsFormErrorOtherBreed"),
      });
    }
  });
}

type FormData = {
  name: string;
  type: "DOG" | "CAT" | "RABBIT" | "BIRD" | "OTHER";
  breed?: string;
  ageMonths?: number | null;
  size?: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE" | null;
  gender?: "MALE" | "FEMALE" | "UNKNOWN" | null;
  color?: string;
  weight?: number | null;
  description?: string;
  isVaccinated: boolean;
  isNeutered: boolean;
  isMicrochipped: boolean;
  isGoodWithKids?: boolean | null;
  isGoodWithDogs?: boolean | null;
  isGoodWithCats?: boolean | null;
  imageUrls?: string[];
  documents?: DocItem[];
};

const cls = "w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function AddAnimalForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = makeSchema(t);

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        type: "DOG", isVaccinated: false, isNeutered: false, isMicrochipped: false, imageUrls: [], documents: [],
      },
    });

  const isOther = watch("type") === "OTHER";

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? t("animalsFormErrorUnknown")); return; }
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      {/* Basic details */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("animalsFormSectionBasic")}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("animalsFormName")} error={errors.name?.message}>
              <input {...register("name")} placeholder={t("animalsFormNamePlaceholder")} className={cls} />
            </Field>
            <Field label={t("animalsFormSpecies")} error={errors.type?.message}>
              <select {...register("type")} className={cls}>
                <option value="DOG">{t("animalsFormSpeciesDog")}</option>
                <option value="CAT">{t("animalsFormSpeciesCat")}</option>
                <option value="RABBIT">{t("animalsFormSpeciesRabbit")}</option>
                <option value="BIRD">{t("animalsFormSpeciesBird")}</option>
                <option value="OTHER">{t("animalsFormSpeciesOther")}</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={isOther ? t("animalsFormBreedOther") : t("animalsFormBreed")} error={errors.breed?.message}>
              <input
                {...register("breed")}
                placeholder={isOther ? t("animalsFormBreedOtherPlaceholder") : t("animalsFormBreedPlaceholder")}
                className={cls}
              />
            </Field>
            <Field label={t("animalsFormColor")} error={errors.color?.message}>
              <input {...register("color")} placeholder={t("animalsFormColorPlaceholder")} className={cls} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label={t("animalsFormAgeMonths")} error={errors.ageMonths?.message}>
              <input {...register("ageMonths")} type="number" min={0} placeholder={t("animalsFormAgePlaceholder")} className={cls} />
            </Field>
            <Field label={t("animalsFormSize")} error={errors.size?.message}>
              <select {...register("size")} className={cls}>
                <option value="">–</option>
                <option value="SMALL">{t("animalsFormSizeSmall")}</option>
                <option value="MEDIUM">{t("animalsFormSizeMedium")}</option>
                <option value="LARGE">{t("animalsFormSizeLarge")}</option>
                <option value="EXTRA_LARGE">{t("animalsFormSizeExtraLarge")}</option>
              </select>
            </Field>
            <Field label={t("animalsFormWeight")} error={errors.weight?.message}>
              <input {...register("weight")} type="number" step="0.1" min={0} placeholder={t("animalsFormWeightPlaceholder")} className={cls} />
            </Field>
          </div>

          <Field label={t("animalsFormGender")} error={errors.gender?.message}>
            <select {...register("gender")} className={cls}>
              <option value="">–</option>
              <option value="MALE">{t("animalsFormGenderMale")}</option>
              <option value="FEMALE">{t("animalsFormGenderFemale")}</option>
              <option value="UNKNOWN">{t("animalsFormGenderUnknown")}</option>
            </select>
          </Field>

          <Field label={t("animalsFormDescription")} error={errors.description?.message}>
            <textarea {...register("description")} rows={3} placeholder={t("animalsFormDescriptionPlaceholder")} className={`${cls} resize-none`} />
          </Field>
        </div>
      </div>

      {/* Photos */}
      <Controller
        name="imageUrls"
        control={control}
        render={({ field }) => (
          <MultiImageUpload
            label={t("animalsFormPhotos")}
            value={field.value ?? []}
            onChange={field.onChange}
          />
        )}
      />

      {/* Official documents */}
      <Controller
        name="documents"
        control={control}
        render={({ field }) => (
          <MultiDocumentUpload
            label={t("animalsFormDocuments")}
            value={(field.value as DocItem[]) ?? []}
            onChange={field.onChange}
          />
        )}
      />

      {/* Health status */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("animalsFormSectionHealth")}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: "isVaccinated"   as const, labelKey: "animalsFormVaccinated" },
            { name: "isNeutered"     as const, labelKey: "animalsFormNeutered" },
            { name: "isMicrochipped" as const, labelKey: "animalsFormMicrochipped" },
          ].map(({ name, labelKey }) => (
            <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors">
              <input type="checkbox" {...register(name)} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
              <span className="text-sm text-gray-700">{t(labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Traits */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("animalsFormSectionTraits")}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: "isGoodWithKids" as const, labelKey: "animalsFormGoodWithKids" },
            { name: "isGoodWithDogs" as const, labelKey: "animalsFormGoodWithDogs" },
            { name: "isGoodWithCats" as const, labelKey: "animalsFormGoodWithCats" },
          ].map(({ name, labelKey }) => (
            <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors">
              <input type="checkbox" {...register(name)} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
              <span className="text-sm text-gray-700">{t(labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <X className="h-4 w-4" /> {t("animalsFormCancel")}
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
          {isSubmitting ? t("animalsFormSaving") : t("animalsFormSubmit")}
        </button>
      </div>
    </form>
  );
}
