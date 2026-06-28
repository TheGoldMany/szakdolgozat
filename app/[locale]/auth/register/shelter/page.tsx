"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@/i18n/navigation";
import { PawPrint, Building2, BadgeCheck, Users, Heart, MailCheck } from "lucide-react";
import { shelterRegisterSchema, type ShelterRegisterInput } from "@/lib/validations/auth";
import { toast } from "sonner";

export default function ShelterRegisterPage() {
  const [serverError, setServerError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShelterRegisterInput>({ resolver: zodResolver(shelterRegisterSchema) });

  async function onSubmit(data: ShelterRegisterInput) {
    setServerError("");
    const res = await fetch("/api/auth/register-shelter", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      setServerError(json.error ?? "Hiba történt a regisztráció során.");
      return;
    }
    setRegisteredEmail(data.email);
  }

  async function resend() {
    if (!registeredEmail) return;
    try {
      await fetch("/api/auth/resend-verification", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: registeredEmail }),
      });
      toast.success("Megerősítő emailt újraküldtük.");
    } catch {
      toast.error("Hálózati hiba.");
    }
    setResent(true);
  }

  const inputCls =
    "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div className="relative hidden overflow-hidden bg-brand-500 lg:flex lg:w-[45%] lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {[
          { top: "5%",  left: "10%", size: 52, rotate: -15, opacity: 0.12 },
          { top: "20%", left: "72%", size: 36, rotate:  25, opacity: 0.10 },
          { top: "50%", left: "3%",  size: 44, rotate: -30, opacity: 0.09 },
          { top: "65%", left: "78%", size: 32, rotate:  10, opacity: 0.11 },
          { top: "82%", left: "40%", size: 40, rotate: -20, opacity: 0.08 },
        ].map((p, i) => (
          <PawPrint
            key={i}
            className="absolute text-white"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, transform: `rotate(${p.rotate}deg)`, opacity: p.opacity }}
          />
        ))}

        <div className="relative z-10 text-center text-white">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 shadow-xl">
            <Building2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Regisztráld a menhelyed</h2>
          <p className="mt-3 text-base text-white/80">
            Csatlakozz a platformhoz és találj gazdit az állataidnak.
          </p>

          <div className="mt-10 space-y-4 text-left">
            {[
              { icon: Heart,      title: "Örökbefogadás kezelése", desc: "Tedd közzé állataidat, fogadd a kérelmeket egy helyen." },
              { icon: Users,      title: "Önkéntesek és adományok", desc: "Kezeld az önkénteseket, gyűjtéseket és előfizetéseket." },
              { icon: BadgeCheck, title: "Hitelesített jelölés",    desc: "A jóváhagyás után hitelesített jelzést kap a menhelyed." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-white/70">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Mobile-only logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-brand-500">
              <PawPrint className="h-6 w-6" />
              ÁllatiMenhelyek.hu
            </Link>
          </div>

          {registeredEmail ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
              <MailCheck className="mx-auto mb-4 h-12 w-12 text-brand-500" />
              <h2 className="text-xl font-bold text-gray-900">Erősítsd meg az email-címed</h2>
              <p className="mt-2 text-sm text-gray-500">
                Küldtünk egy megerősítő emailt a(z) <strong>{registeredEmail}</strong> címre.
                Kattints a benne lévő linkre a fiók aktiválásához.
              </p>
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-sm text-blue-800">
                A menhelyed a megerősítés után máris használható lesz, de a{" "}
                <strong>hitelesített</strong> jelzést csak a moderátorok jóváhagyása után kapja meg.
              </div>
              <div className="mt-6 space-y-3">
                {resent ? (
                  <p className="text-sm font-medium text-green-600">Megerősítő emailt újraküldtük.</p>
                ) : (
                  <button type="button" onClick={resend} className="text-sm font-semibold text-brand-600 hover:underline">
                    Nem kaptad meg? Küldd újra
                  </button>
                )}
                <div>
                  <Link href="/auth/login" className="text-sm text-gray-400 hover:text-brand-600 transition-colors">
                    Bejelentkezés
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Menhely regisztráció</h1>
                <p className="mt-1.5 text-sm text-gray-500">
                  Add meg a menhely és az adminisztrátor adatait. A jóváhagyás után hitelesített jelzést kaptok.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {/* Menhely adatok */}
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">A menhely adatai</p>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Menhely neve</label>
                    <input placeholder="pl. Boldog Tappancs Menhely" className={inputCls} {...register("shelterName")} />
                    {errors.shelterName && <p className="mt-1 text-xs text-red-500">{errors.shelterName.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Város</label>
                      <input placeholder="pl. Budapest" className={inputCls} {...register("city")} />
                      {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Irányítószám</label>
                      <input placeholder="1111" className={inputCls} {...register("zipCode")} />
                      {errors.zipCode && <p className="mt-1 text-xs text-red-500">{errors.zipCode.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Cím</label>
                    <input placeholder="pl. Állatvédő utca 12." className={inputCls} {...register("address")} />
                    {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Telefonszám <span className="text-gray-400">(opcionális)</span></label>
                      <input placeholder="+36 30 123 4567" className={inputCls} {...register("phone")} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Menhely email <span className="text-gray-400">(opcionális)</span></label>
                      <input type="email" placeholder="info@menhely.hu" className={inputCls} {...register("shelterEmail")} />
                      {errors.shelterEmail && <p className="mt-1 text-xs text-red-500">{errors.shelterEmail.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Rövid bemutatkozás <span className="text-gray-400">(opcionális)</span></label>
                    <textarea rows={3} placeholder="Néhány mondat a menhelyről…" className={inputCls} {...register("description")} />
                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                  </div>

                  {/* Admin fiók */}
                  <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Adminisztrátori fiók</p>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Teljes név</label>
                    <input autoComplete="name" placeholder="Kovács Anna" className={inputCls} {...register("adminName")} />
                    {errors.adminName && <p className="mt-1 text-xs text-red-500">{errors.adminName.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email cím</label>
                    <input type="email" autoComplete="email" placeholder="anna@menhely.hu" className={inputCls} {...register("email")} />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Jelszó</label>
                      <input type="password" autoComplete="new-password" placeholder="Min. 8 karakter" className={inputCls} {...register("password")} />
                      {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Jelszó újra</label>
                      <input type="password" autoComplete="new-password" placeholder="••••••••" className={inputCls} {...register("confirmPassword")} />
                      {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>

                  {serverError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {serverError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                  >
                    {isSubmitting ? "Regisztráció…" : "Menhely regisztrálása"}
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Magánszemélyként regisztrálnál?{" "}
                    <Link href="/auth/register" className="font-semibold text-brand-500 hover:underline">
                      Sima regisztráció
                    </Link>
                  </p>
                </form>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-400 hover:text-brand-500 transition-colors">
              Vissza a főoldalra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
