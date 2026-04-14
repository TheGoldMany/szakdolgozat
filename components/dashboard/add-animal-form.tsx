"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

const schema = z.object({
  name:           z.string().min(1, "Kötelező"),
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
  imageUrl:       z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const cls = "w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition bg-white";

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
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        type: "DOG", isVaccinated: false, isNeutered: false, isMicrochipped: false,
      },
    });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/animals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.error ?? "Ismeretlen hiba"); return; }
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{serverError}</div>
      )}

      {/* Alapadatok */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Alapadatok</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Név *" error={errors.name?.message}>
              <input {...register("name")} placeholder="pl. Bodri" className={cls} />
            </Field>
            <Field label="Faj *" error={errors.type?.message}>
              <select {...register("type")} className={cls}>
                <option value="DOG">🐕 Kutya</option>
                <option value="CAT">🐈 Macska</option>
                <option value="RABBIT">🐇 Nyúl</option>
                <option value="BIRD">🦜 Madár</option>
                <option value="OTHER">🐾 Egyéb</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fajta" error={errors.breed?.message}>
              <input {...register("breed")} placeholder="pl. Labrador" className={cls} />
            </Field>
            <Field label="Szín" error={errors.color?.message}>
              <input {...register("color")} placeholder="pl. barna" className={cls} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Kor (hónap)" error={errors.ageMonths?.message}>
              <input {...register("ageMonths")} type="number" min={0} placeholder="pl. 24" className={cls} />
            </Field>
            <Field label="Méret" error={errors.size?.message}>
              <select {...register("size")} className={cls}>
                <option value="">–</option>
                <option value="SMALL">Kis</option>
                <option value="MEDIUM">Közepes</option>
                <option value="LARGE">Nagy</option>
                <option value="EXTRA_LARGE">Extra nagy</option>
              </select>
            </Field>
            <Field label="Súly (kg)" error={errors.weight?.message}>
              <input {...register("weight")} type="number" step="0.1" min={0} placeholder="pl. 8.5" className={cls} />
            </Field>
          </div>

          <Field label="Nem" error={errors.gender?.message}>
            <select {...register("gender")} className={cls}>
              <option value="">–</option>
              <option value="MALE">♂ Hím</option>
              <option value="FEMALE">♀ Nőstény</option>
              <option value="UNKNOWN">Ismeretlen</option>
            </select>
          </Field>

          <Field label="Leírás" error={errors.description?.message}>
            <textarea {...register("description")} rows={3} placeholder="Mutasd be az állatot..." className={`${cls} resize-none`} />
          </Field>
        </div>
      </div>

      {/* Fotó */}
      <Controller
        name="imageUrl"
        control={control}
        defaultValue=""
        render={({ field }) => (
          <ImageUpload
            label="Fotó"
            value={field.value ?? ""}
            onChange={field.onChange}
          />
        )}
      />

      {/* Egészségi állapot */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Egészségi állapot</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: "isVaccinated"   as const, label: "💉 Oltott" },
            { name: "isNeutered"     as const, label: "✂️ Ivartalanított" },
            { name: "isMicrochipped" as const, label: "📡 Chippelt" },
          ].map(({ name, label }) => (
            <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors">
              <input type="checkbox" {...register(name)} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Jellemzők */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Jellemzők</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { name: "isGoodWithKids" as const, label: "👶 Gyerekbarát" },
            { name: "isGoodWithDogs" as const, label: "🐕 Kutyabarát" },
            { name: "isGoodWithCats" as const, label: "🐈 Macskajáró" },
          ].map(({ name, label }) => (
            <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition-colors">
              <input type="checkbox" {...register(name)} className="h-4 w-4 rounded border-gray-300 text-brand-500" />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <X className="h-4 w-4" /> Mégse
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
          {isSubmitting ? "Mentés..." : "Állat hozzáadása"}
        </button>
      </div>
    </form>
  );
}
