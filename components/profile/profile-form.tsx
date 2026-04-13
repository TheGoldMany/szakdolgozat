"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name:    z.string().min(2, "Legalább 2 karakter szükséges"),
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
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? "Ismeretlen hiba");
      return;
    }
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Profil sikeresen mentve!
        </div>
      )}

      {/* Név */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Teljes név <span className="text-red-500">*</span>
        </label>
        <input
          {...register("name")}
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Telefon */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefonszám</label>
        <input
          {...register("phone")}
          placeholder="+36 30 123 4567"
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Város */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Város</label>
        <input
          {...register("city")}
          placeholder="Budapest"
          className="h-9 w-full rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Cím */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Cím</label>
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
        {isSubmitting ? "Mentés..." : "Profil mentése"}
      </button>
    </form>
  );
}
