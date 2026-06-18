"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { LocationPicker } from "@/components/ui/location-picker";

function buildSchema(t: ReturnType<typeof useTranslations<"reports">>) {
  return z.object({
    type:         z.enum(["LOST", "FOUND", "STRAY"]),
    animalType:   z.enum(["DOG", "CAT", "RABBIT", "BIRD", "OTHER"]),
    name:         z.string().optional(),
    breed:        z.string().optional(),
    color:        z.string().optional(),
    gender:       z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
    description:  z.string().min(10, t("validationDescMin")),
    city:         z.string().min(1, t("validationRequired")),
    address:      z.string().optional(),
    lat:          z.number().optional(),
    lng:          z.number().optional(),
    contactName:  z.string().min(2, t("validationRequired")),
    contactPhone: z.string().min(1, t("validationRequired")),
    contactEmail: z.string().email(t("validationInvalidEmail")),
    imageUrls:    z.array(z.string()).optional(),
  });
}

type FormData = {
  type:         "LOST" | "FOUND" | "STRAY";
  animalType:   "DOG" | "CAT" | "RABBIT" | "BIRD" | "OTHER";
  name?:        string;
  breed?:       string;
  color?:       string;
  gender?:      "MALE" | "FEMALE" | "UNKNOWN";
  description:  string;
  city:         string;
  address?:     string;
  lat?:         number;
  lng?:         number;
  contactName:  string;
  contactPhone: string;
  contactEmail: string;
  imageUrls?:   string[];
};

const inputCls = "h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";
const inputWhiteCls = `${inputCls} bg-white`;

export function ReportForm() {
  const router = useRouter();
  const t  = useTranslations("reports");
  const tc = useTranslations("common");
  const [serverError, setServerError] = useState<string | null>(null);
  const [matching, setMatching]       = useState(false);

  const schema = buildSchema(t);

  const TYPE_OPTIONS = [
    { value: "LOST",  label: t("lost"),  sub: t("typeLostSub")  },
    { value: "FOUND", label: t("found"), sub: t("typeFoundSub") },
    { value: "STRAY", label: t("stray"), sub: t("typestraySub") },
  ];

  const ANIMAL_OPTIONS = [
    { value: "DOG",    label: t("animalDog")    },
    { value: "CAT",    label: t("animalCat")    },
    { value: "RABBIT", label: t("animalRabbit") },
    { value: "BIRD",   label: t("animalBird")   },
    { value: "OTHER",  label: t("animalOther")  },
  ];

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "LOST", animalType: "DOG", imageUrls: [] },
  });

  const selectedType = watch("type");
  const lat = watch("lat");
  const lng = watch("lng");

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? tc("error")); return; }

    toast.success(t("formSuccess"));

    // Kép-alapú párosítás futtatása (legjobb tudás szerint, hibatűrően).
    const reportId = json.report.id;
    setMatching(true);
    try {
      await fetch(`/api/reports/${reportId}/match`, { method: "POST" });
    } catch {
      /* a párosítás hibája ne akadályozza a bejelentés megtekintését */
    }
    router.push(`/reports/${reportId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Bejelentés típusa */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t("formTypeLabel")} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer flex-col gap-0.5 rounded-xl border-2 border-gray-200 px-4 py-3 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" value={o.value} {...register("type")} className="sr-only" />
              <span className="text-sm font-semibold text-gray-800">{o.label}</span>
              <span className="text-xs text-gray-400">{o.sub}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Állatfaj */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {t("formSpeciesLabel")} <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ANIMAL_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-2 border-gray-200 px-3 py-2 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" value={o.value} {...register("animalType")} className="sr-only" />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Alap adatok */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {selectedType === "LOST" && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("formAnimalName")}</label>
            <input {...register("name")} placeholder={t("formAnimalNamePlaceholder")} className={inputCls} />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("formBreed")}</label>
          <input {...register("breed")} placeholder={t("formBreedPlaceholder")} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("formColor")}</label>
          <input {...register("color")} placeholder={t("formColorPlaceholder")} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("formGender")}</label>
          <select {...register("gender")}
            className="h-9 w-full rounded-xl border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">{t("genderUnknown")}</option>
            <option value="MALE">{t("genderMale")}</option>
            <option value="FEMALE">{t("genderFemale")}</option>
          </select>
        </div>
      </div>

      {/* Leírás */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("formDescription")} <span className="text-red-500">*</span>
        </label>
        <textarea {...register("description")} rows={4}
          placeholder={t("formDescriptionPlaceholder")}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {/* Fotók */}
      <Controller
        name="imageUrls"
        control={control}
        render={({ field }) => (
          <MultiImageUpload
            value={field.value ?? []}
            onChange={field.onChange}
            max={6}
            label={t("formPhotoLabel")}
          />
        )}
      />

      {/* Helyszín */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("formCity")} <span className="text-red-500">*</span>
            </label>
            <input {...register("city")} placeholder={t("formCityPlaceholder")} className={inputCls} />
            {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("formAddress")}</label>
            <input {...register("address")} placeholder={t("formAddressPlaceholder")} className={inputCls} />
          </div>
        </div>

        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={({ lat: newLat, lng: newLng, city, address }) => {
            setValue("lat", newLat);
            setValue("lng", newLng);
            if (city)    setValue("city",    city);
            if (address) setValue("address", address);
          }}
        />
      </div>

      {/* Kapcsolattartó */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-700">{t("formContactSection")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("formContactName")} <span className="text-red-500">*</span>
            </label>
            <input {...register("contactName")} placeholder={t("formContactNamePlaceholder")} className={inputWhiteCls} />
            {errors.contactName && <p className="mt-1 text-xs text-red-500">{errors.contactName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("formContactPhone")} <span className="text-red-500">*</span>
            </label>
            <input {...register("contactPhone")} placeholder={t("formContactPhonePlaceholder")} className={inputWhiteCls} />
            {errors.contactPhone && <p className="mt-1 text-xs text-red-500">{errors.contactPhone.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t("formContactEmail")} <span className="text-red-500">*</span>
            </label>
            <input {...register("contactEmail")} type="email" placeholder={t("formContactEmailPlaceholder")} className={inputWhiteCls} />
            {errors.contactEmail && <p className="mt-1 text-xs text-red-500">{errors.contactEmail.message}</p>}
          </div>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting || matching}
        className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
        {matching ? t("formMatching") : isSubmitting ? t("formSubmitting") : t("formSubmit")}
      </button>
    </form>
  );
}
