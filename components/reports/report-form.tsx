"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MultiImageUpload } from "@/components/ui/multi-image-upload";
import { LocationPicker } from "@/components/ui/location-picker";
import { cn } from "@/lib/utils";
import { REPORT_TYPE_STYLE, SPECIES_ICON } from "@/lib/report-style";

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

type ReportTypeValue = "LOST" | "FOUND" | "STRAY";
type AnimalTypeValue = "DOG" | "CAT" | "RABBIT" | "BIRD" | "OTHER";

type FormData = {
  type:         ReportTypeValue;
  animalType:   AnimalTypeValue;
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

export interface ReportFormDefaults {
  contactName?:  string;
  contactPhone?: string;
  contactEmail?: string;
}

const inputCls =
  "h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400 " +
  "focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200";
const labelCls = "mb-1.5 block text-sm font-medium text-gray-800";

function Req() {
  return <span className="text-red-600" aria-hidden> *</span>;
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  // Az elválasztó vonal az előző szakasztól választ el; az elsőnek nincs előzője.
  // (A `first:` nem jó: előtte a rejtett csalimező és a hibadoboz áll.)
  return (
    <section className={cn("grid gap-4 md:grid-cols-[2.25rem_minmax(0,1fr)]", n > 1 && "border-t border-gray-200 pt-6")}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-graphite font-display text-sm font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-gray-900">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-gray-500">{hint}</p>}
        <div className="mt-4 space-y-4">{children}</div>
      </div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

/**
 * Bejelentő űrlap.
 *
 * Számozott szakaszokra bontva, a gondolkodás sorrendjében: mi történt,
 * milyen állat, fotó, hol, és hogyan érnek el. Bejelentkezett felhasználónál
 * az elérhetőség előre ki van töltve – az oldal eddig ezt ígérte, de nem tette.
 */
export function ReportForm({ defaults }: { defaults?: ReportFormDefaults }) {
  const router = useRouter();
  const t  = useTranslations("reports");
  const tc = useTranslations("common");
  const [serverError, setServerError] = useState<string | null>(null);
  const [matching, setMatching]       = useState(false);

  const schema = buildSchema(t);

  const TYPE_OPTIONS: { value: ReportTypeValue; label: string; sub: string }[] = [
    { value: "LOST",  label: t("lost"),  sub: t("typeLostSub")  },
    { value: "FOUND", label: t("found"), sub: t("typeFoundSub") },
    { value: "STRAY", label: t("stray"), sub: t("typestraySub") },
  ];

  const ANIMAL_OPTIONS: { value: AnimalTypeValue; label: string }[] = [
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
    defaultValues: {
      type: "LOST",
      animalType: "DOG",
      imageUrls: [],
      contactName:  defaults?.contactName  ?? "",
      contactPhone: defaults?.contactPhone ?? "",
      contactEmail: defaults?.contactEmail ?? "",
    },
  });

  const selectedType = watch("type");
  const lat = watch("lat");
  const lng = watch("lng");

  const honeypotRef = useRef<HTMLInputElement>(null);

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // A csali mező értéke — embernél mindig üres (lásd az API-t).
      body: JSON.stringify({ ...data, _hp: honeypotRef.current?.value ?? "" }),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {/* Csali mező botoknak. Képernyőn kívül, nem fókuszálható, a
          képernyőolvasó elől is rejtve, ember nem tölti ki. A „website" név
          szándékos: az automatikus kitöltők erre ugranak a legszívesebben. */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        defaultValue=""
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
      />
      {serverError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* 1. Mi történt? */}
      <Section n={1} title={t("formStepWhat")}>
        <fieldset>
          <legend className="sr-only">{t("formTypeLabel")}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TYPE_OPTIONS.map((o) => {
              const s    = REPORT_TYPE_STYLE[o.value];
              const Icon = s.icon;
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border-2 border-gray-200 p-3 transition-colors hover:border-gray-300",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-200",
                    s.ring,
                  )}
                >
                  <input type="radio" value={o.value} {...register("type")} className="sr-only" />
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", s.tint, s.ink)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{o.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-gray-500">{o.sub}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Section>

      {/* 2. Az állat */}
      <Section n={2} title={t("formStepAnimal")}>
        <fieldset>
          <legend className={labelCls}>{t("formSpeciesLabel")}<Req /></legend>
          <div className="flex flex-wrap gap-2">
            {ANIMAL_OPTIONS.map((o) => {
              const Icon = SPECIES_ICON[o.value];
              return (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:border-gray-400 has-[:checked]:border-graphite has-[:checked]:bg-graphite has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-200"
                >
                  <input type="radio" value={o.value} {...register("animalType")} className="sr-only" />
                  <Icon className="h-4 w-4" />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedType === "LOST" && (
            <div>
              <label htmlFor="r-name" className={labelCls}>{t("formAnimalName")}</label>
              <input id="r-name" {...register("name")} placeholder={t("formAnimalNamePlaceholder")} className={inputCls} />
            </div>
          )}
          <div>
            <label htmlFor="r-breed" className={labelCls}>{t("formBreed")}</label>
            <input id="r-breed" {...register("breed")} placeholder={t("formBreedPlaceholder")} className={inputCls} />
          </div>
          <div>
            <label htmlFor="r-color" className={labelCls}>{t("formColor")}</label>
            <input id="r-color" {...register("color")} placeholder={t("formColorPlaceholder")} className={inputCls} />
          </div>
          <div>
            <label htmlFor="r-gender" className={labelCls}>{t("formGender")}</label>
            <select id="r-gender" {...register("gender")} className={cn(inputCls, "px-2")}>
              <option value="">{t("genderUnknown")}</option>
              <option value="MALE">{t("genderMale")}</option>
              <option value="FEMALE">{t("genderFemale")}</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="r-desc" className={labelCls}>{t("formDescription")}<Req /></label>
          <textarea
            id="r-desc"
            {...register("description")}
            rows={5}
            placeholder={t("formDescriptionPlaceholder")}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <FieldError message={errors.description?.message} />
        </div>
      </Section>

      {/* 3. Fotók */}
      <Section n={3} title={t("formStepPhotos")} hint={t("formPhotoHint")}>
        <Controller
          name="imageUrls"
          control={control}
          render={({ field }) => (
            <MultiImageUpload value={field.value ?? []} onChange={field.onChange} max={6} label="" />
          )}
        />
      </Section>

      {/* 4. Hol? */}
      <Section n={4} title={t("formStepWhere")} hint={t("formLocationHint")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-city" className={labelCls}>{t("formCity")}<Req /></label>
            <input id="r-city" {...register("city")} placeholder={t("formCityPlaceholder")} className={inputCls} />
            <FieldError message={errors.city?.message} />
          </div>
          <div>
            <label htmlFor="r-address" className={labelCls}>{t("formAddress")}</label>
            <input id="r-address" {...register("address")} placeholder={t("formAddressPlaceholder")} className={inputCls} />
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
      </Section>

      {/* 5. Elérhetőség */}
      <Section n={5} title={t("formContactSection")} hint={t("formContactHint")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="r-cname" className={labelCls}>{t("formContactName")}<Req /></label>
            <input id="r-cname" autoComplete="name" {...register("contactName")} placeholder={t("formContactNamePlaceholder")} className={inputCls} />
            <FieldError message={errors.contactName?.message} />
          </div>
          <div>
            <label htmlFor="r-cphone" className={labelCls}>{t("formContactPhone")}<Req /></label>
            <input id="r-cphone" type="tel" autoComplete="tel" {...register("contactPhone")} placeholder={t("formContactPhonePlaceholder")} className={inputCls} />
            <FieldError message={errors.contactPhone?.message} />
          </div>
          <div>
            <label htmlFor="r-cemail" className={labelCls}>{t("formContactEmail")}<Req /></label>
            <input id="r-cemail" type="email" autoComplete="email" {...register("contactEmail")} placeholder={t("formContactEmailPlaceholder")} className={inputCls} />
            <FieldError message={errors.contactEmail?.message} />
          </div>
        </div>
      </Section>

      <div className="border-t border-gray-200 pt-6 md:pl-[2.25rem]">
        <button
          type="submit"
          disabled={isSubmitting || matching}
          className="h-12 w-full rounded-lg bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60 md:ml-4 md:w-auto md:px-8"
        >
          {matching ? t("formMatching") : isSubmitting ? t("formSubmitting") : t("formSubmit")}
        </button>
      </div>
    </form>
  );
}
