"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  type:         z.enum(["LOST", "FOUND", "STRAY"]),
  animalType:   z.enum(["DOG", "CAT", "RABBIT", "BIRD", "OTHER"]),
  name:         z.string().optional(),
  breed:        z.string().optional(),
  color:        z.string().optional(),
  gender:       z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
  description:  z.string().min(10, "Legalább 10 karakter szükséges"),
  city:         z.string().min(1, "Kötelező mező"),
  address:      z.string().optional(),
  contactName:  z.string().min(2, "Kötelező mező"),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Érvénytelen email"),
});

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: "LOST",  label: "🔍 Elveszett – keresem a gazdát" },
  { value: "FOUND", label: "🏠 Megtalált – gazdát keresek neki" },
  { value: "STRAY", label: "🐾 Kóbor – segítséget kérek" },
];

const ANIMAL_OPTIONS = [
  { value: "DOG",    label: "🐕 Kutya" },
  { value: "CAT",    label: "🐈 Macska" },
  { value: "RABBIT", label: "🐇 Nyúl" },
  { value: "BIRD",   label: "🦜 Madár" },
  { value: "OTHER",  label: "🐾 Egyéb" },
];

export function ReportForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "LOST", animalType: "DOG" },
  });

  const selectedType = watch("type");

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Hiba történt"); return; }
    router.push(`/reports/${json.report.id}`);
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
        <label className="mb-2 block text-sm font-medium text-gray-700">Bejelentés típusa <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TYPE_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-3 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" value={o.value} {...register("type")} className="sr-only" />
              <span className="text-sm font-medium text-gray-700">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Állatfaj */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Állatfaj <span className="text-red-500">*</span></label>
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
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Állat neve</label>
            <input {...register("name")} placeholder="pl. Bodri"
              className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Fajta</label>
          <input {...register("breed")} placeholder="pl. Labrador"
            className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Szín / jellemzők</label>
          <input {...register("color")} placeholder="pl. Fekete-fehér foltos"
            className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Nem</label>
          <select {...register("gender")}
            className="h-9 w-full rounded-xl border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">Ismeretlen</option>
            <option value="MALE">Hím</option>
            <option value="FEMALE">Nőstény</option>
          </select>
        </div>
      </div>

      {/* Leírás */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Részletes leírás <span className="text-red-500">*</span>
        </label>
        <textarea {...register("description")} rows={4}
          placeholder="Mikor és hol tűnt el / találtad? Ismertető jelek, körülmények..."
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
      </div>

      {/* Helyszín */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Város <span className="text-red-500">*</span>
          </label>
          <input {...register("city")} placeholder="pl. Budapest"
            className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Pontos helyszín</label>
          <input {...register("address")} placeholder="pl. Városliget közelében"
            className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      {/* Kapcsolattartó */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Kapcsolattartói adatok</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Név <span className="text-red-500">*</span></label>
            <input {...register("contactName")} placeholder="Teljes név"
              className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.contactName && <p className="mt-1 text-xs text-red-500">{errors.contactName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefonszám</label>
            <input {...register("contactPhone")} placeholder="+36 30 123 4567"
              className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></label>
            <input {...register("contactEmail")} type="email" placeholder="email@example.com"
              className="h-9 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.contactEmail && <p className="mt-1 text-xs text-red-500">{errors.contactEmail.message}</p>}
          </div>
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}
        className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
        {isSubmitting ? "Beküldés..." : "Bejelentés elküldése"}
      </button>
    </form>
  );
}
