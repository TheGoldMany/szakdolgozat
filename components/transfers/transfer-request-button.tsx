"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";

interface Shelter { id: string; name: string }

interface Props {
  animalId:    string;
  animalName:  string;
  shelters:    Shelter[];
  onSuccess?: () => void;
}

export function TransferRequestButton({ animalId, animalName, shelters, onSuccess }: Props) {
  const [open, setOpen]           = useState(false);
  const [toShelterId, setToShelterId] = useState("");
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!toShelterId) { setError("Válassz célmenhelyet."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/animals/${animalId}/transfer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ toShelterId, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hiba történt");
      setOpen(false);
      setToShelterId("");
      setNote("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
      >
        <ArrowRightLeft className="h-4 w-4" />
        Áthelyezés kérése
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Állat áthelyezése</h2>
            <p className="mb-4 text-sm text-gray-500">
              <strong>{animalName}</strong> áthelyezési kérelme a kiválasztott menhelyre
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Célmenhely *</label>
                <select
                  value={toShelterId}
                  onChange={e => setToShelterId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— Válassz menhelyet —</option>
                  {shelters.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Megjegyzés</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Indoklás, különleges igények…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {loading ? "Küldés…" : "Kérelem küldése"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
