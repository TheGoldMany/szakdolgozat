"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Check, X, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  shelterName:   z.string().min(2, "Min. 2 karakter"),
  city:          z.string().min(1, "Kötelező"),
  address:       z.string().min(2, "Min. 2 karakter"),
  zipCode:       z.string().optional(),
  phone:         z.string().optional(),
  shelterEmail:  z.string().email("Érvénytelen email").optional().or(z.literal("")),
  description:   z.string().optional(),
  adminName:     z.string().min(2, "Min. 2 karakter"),
  adminEmail:    z.string().email("Érvénytelen email"),
  adminPassword: z.string().min(6, "Min. 6 karakter"),
});

type FormData = z.infer<typeof schema>;

interface CreatedResult {
  shelterName: string;
  adminEmail:  string;
  adminPassword: string;
}

export function AddShelterForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [serverError, setServerError]   = useState<string | null>(null);
  const [created, setCreated]           = useState<CreatedResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied]             = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    const res = await fetch("/api/admin/shelters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      setServerError(json.error ?? "Ismeretlen hiba");
      return;
    }
    setCreated({
      shelterName:   data.shelterName,
      adminEmail:    data.adminEmail,
      adminPassword: data.adminPassword,
    });
    router.refresh();
  }

  function copyCredentials() {
    if (!created) return;
    navigator.clipboard.writeText(
      `Menhely: ${created.shelterName}\nBejelentkezés: ${created.adminEmail}\nJelszó: ${created.adminPassword}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Siker képernyő ──
  if (created) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl bg-green-50 border border-green-200 p-5">
          <p className="flex items-center gap-1.5 font-semibold text-green-800"><Check className="h-4 w-4" /> Menhely sikeresen létrehozva!</p>
          <p className="mt-1 text-sm text-green-700">
            Add át az alábbi belépési adatokat a menhely adminisztrátorának.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Menhely</span>
            <span className="font-semibold text-gray-800">{created.shelterName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-semibold text-gray-800">{created.adminEmail}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Jelszó</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800">
                {showPassword ? created.adminPassword : "••••••••"}
              </span>
              <button onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          ⚠ Ez az oldal frissítése után a jelszó nem lesz visszakereshető. Mentsd el mielőtt bezárod!
        </p>

        <div className="flex gap-3">
          <button
            onClick={copyCredentials}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Másolva!" : "Másolás"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Kész
          </button>
        </div>
      </div>
    );
  }

  // ── Űrlap ──
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Menhely adatok */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Menhely adatai</h3>
        <div className="space-y-3">
          <Field label="Menhely neve *" error={errors.shelterName?.message}>
            <input {...register("shelterName")} placeholder="Boldog Tappancs Menhely" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Város *" error={errors.city?.message}>
              <input {...register("city")} placeholder="Budapest" className={inputCls} />
            </Field>
            <Field label="Irányítószám" error={errors.zipCode?.message}>
              <input {...register("zipCode")} placeholder="1234" className={inputCls} />
            </Field>
          </div>
          <Field label="Cím *" error={errors.address?.message}>
            <input {...register("address")} placeholder="Állatvédő utca 12." className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefon" error={errors.phone?.message}>
              <input {...register("phone")} placeholder="+3630..." className={inputCls} />
            </Field>
            <Field label="Menhely email" error={errors.shelterEmail?.message}>
              <input {...register("shelterEmail")} type="email" placeholder="info@menhely.hu" className={inputCls} />
            </Field>
          </div>
          <Field label="Leírás" error={errors.description?.message}>
            <textarea {...register("description")} rows={2} placeholder="Rövid bemutatkozó szöveg..." className={`${inputCls} resize-none`} />
          </Field>
        </div>
      </div>

      {/* Admin fiók */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Admin fiók adatai</h3>
        <div className="space-y-3">
          <Field label="Admin neve *" error={errors.adminName?.message}>
            <input {...register("adminName")} placeholder="Kovács Anna" className={inputCls} />
          </Field>
          <Field label="Bejelentkezési email *" error={errors.adminEmail?.message}>
            <input {...register("adminEmail")} type="email" placeholder="admin@menhely.hu" className={inputCls} />
          </Field>
          <Field label="Ideiglenes jelszó *" error={errors.adminPassword?.message}>
            <input {...register("adminPassword")} type="text" placeholder="Min. 6 karakter" className={inputCls} />
            <p className="mt-1 text-xs text-gray-400">Add meg a belépési jelszót, amit átadsz a menhely adminisztrátorának.</p>
          </Field>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <X className="h-4 w-4" /> Mégse
        </button>
        <button type="submit" disabled={isSubmitting}
          className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
          {isSubmitting ? "Létrehozás..." : "Menhely létrehozása"}
        </button>
      </div>
    </form>
  );
}

// ── Helpers ──
const inputCls = "w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
