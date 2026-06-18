"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandHeart, X, CheckCircle } from "lucide-react";

interface Props {
  shelterId:       string;
  existingStatus?: string | null;
}

export function VolunteerApplyButton({ shelterId, existingStatus }: Props) {
  const router = useRouter();
  const [open,         setOpen]         = useState(false);
  const [motivation,   setMotivation]   = useState("");
  const [skills,       setSkills]       = useState("");
  const [availability, setAvailability] = useState("");
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);

  if (existingStatus) {
    const label: Record<string, string> = {
      PENDING:  "Önkéntes jelentkezés elbírálás alatt",
      ACTIVE:   "Aktív önkéntes",
      INACTIVE: "Inaktív önkéntes",
      REJECTED: "Jelentkezés elutasítva",
    };
    const color: Record<string, string> = {
      PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
      ACTIVE:   "bg-green-50 text-green-700 border-green-200",
      INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
      REJECTED: "bg-red-50 text-red-600 border-red-200",
    };
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${color[existingStatus] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
        <HandHeart className="h-3.5 w-3.5" />
        {label[existingStatus] ?? existingStatus}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch("/api/volunteers", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          shelterId,
          motivation:   motivation || undefined,
          skills:       skills || undefined,
          availability: availability || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Hiba történt, próbáld újra."); return; }
      setSuccess(true);
      router.refresh();
    } catch {
      toast.error("Hálózati hiba, próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
        <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
        <p className="font-semibold text-green-800">Jelentkezés elküldve!</p>
        <p className="mt-1 text-sm text-green-600">A menhely hamarosan visszajelez.</p>
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors">
          <HandHeart className="h-4 w-4" />
          Önkéntesnek jelentkezem
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">Önkéntes jelentkezés</p>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Motiváció (opcionális)</label>
            <textarea value={motivation} onChange={e => setMotivation(e.target.value)}
              rows={3} maxLength={2000} placeholder="Miért szeretnél önkénteskedni ennél a menhelynél?"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Készségek / tapasztalat</label>
            <input value={skills} onChange={e => setSkills(e.target.value)} maxLength={500}
              placeholder="pl. kutyasétáltatás, adminisztráció, fotózás"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Elérhetőség</label>
            <input value={availability} onChange={e => setAvailability(e.target.value)} maxLength={200}
              placeholder="pl. hétvége, hétfő-péntek reggel"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {loading ? "Küldés..." : "Jelentkezés elküldése"}
          </button>
        </form>
      )}
    </div>
  );
}
