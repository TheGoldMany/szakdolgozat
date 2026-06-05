"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, X, CheckCircle } from "lucide-react";

interface Props {
  shelterId: string;
  animalId?: string;
  animalName?: string;
  onClose?: () => void;
}

export function AppointmentForm({ shelterId, animalId, animalName, onClose }: Props) {
  const router = useRouter();
  const [date,    setDate]    = useState("");
  const [time,    setTime]    = useState("10:00");
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) { setError("Kérlek add meg a dátumot és az időpontot!"); return; }

    setLoading(true); setError(null);

    const proposedAt = new Date(`${date}T${time}:00`).toISOString();

    const res = await fetch("/api/appointments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shelterId, animalId, proposedAt, note: note || undefined }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Hiba történt"); return; }

    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-6 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
        <p className="font-semibold text-green-800">Időpontod elküldve!</p>
        <p className="mt-1 text-sm text-green-600">A menhely hamarosan visszajelez.</p>
        {onClose && (
          <button onClick={onClose}
            className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
            Bezárás
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {animalName && (
        <p className="text-sm text-gray-600">
          Időpont kérése: <span className="font-semibold text-gray-900">{animalName}</span> megtekintésére
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            Dátum *
          </label>
          <input
            required type="date" value={date} min={minDateStr}
            onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            Időpont *
          </label>
          <input
            required type="time" value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-600">Üzenet (opcionális)</label>
        <textarea
          value={note} onChange={e => setNote(e.target.value)}
          rows={3} maxLength={1000}
          placeholder="Pl. délután inkább alkalmas, mert reggel dolgozom…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
          {loading ? "Küldés…" : "Időpont kérése"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-gray-500 hover:bg-gray-50 transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}
