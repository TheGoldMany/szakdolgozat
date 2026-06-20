"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, X, Trash2, DoorOpen, AlertTriangle } from "lucide-react";
import { KENNEL_TYPE_LABELS, ALL_KENNEL_TYPES } from "@/lib/kennel";
import type { KennelType } from "@prisma/client";

interface AnimalLite {
  id:       string;
  name:     string;
  status:   string;
  kennelId: string | null;
}
interface KennelLite {
  id:       string;
  name:     string;
  type:     KennelType;
  capacity: number;
  note:     string | null;
  _count:   { animals: number };
}

interface Props {
  initialKennels: KennelLite[];
  animals:        AnimalLite[];  // a menhely összes (nem örökbefogadott) állata
}

export function KennelManager({ initialKennels, animals: initialAnimals }: Props) {
  const router = useRouter();
  const t = useTranslations('kennels');
  const [kennels, setKennels] = useState<KennelLite[]>(initialKennels);
  const [animals, setAnimals] = useState<AnimalLite[]>(initialAnimals);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create form state
  const [name, setName]         = useState("");
  const [type, setType]         = useState<KennelType>("KENNEL");
  const [capacity, setCapacity] = useState(1);
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);

  function occupancy(kennelId: string) {
    return animals.filter(a => a.kennelId === kennelId).length;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch("/api/kennels", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, type, capacity, note: note || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Hiba"); return; }
    setKennels(prev => [...prev, data]);
    setShowForm(false); setName(""); setType("KENNEL"); setCapacity(1); setNote("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd a férőhelyet? A benne lévő állatok férőhely nélkül maradnak.")) return;
    await fetch(`/api/kennels/${id}`, { method: "DELETE" });
    setKennels(prev => prev.filter(k => k.id !== id));
    setAnimals(prev => prev.map(a => a.kennelId === id ? { ...a, kennelId: null } : a));
    router.refresh();
  }

  async function handleMove(animalId: string, kennelId: string | null) {
    setError(null);
    const res = await fetch(`/api/animals/${animalId}/kennel`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ kennelId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Az áthelyezés nem sikerült"); return; }
    setAnimals(prev => prev.map(a => a.id === animalId ? { ...a, kennelId } : a));
    router.refresh();
  }

  const unassigned = animals.filter(a => !a.kennelId);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Új férőhely */}
      <div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? t('cancel') : t('newKennel')}
        </button>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Megnevezés *</label>
                <input required value={name} onChange={e => setName(e.target.value)}
                  placeholder="pl. A-1 kennel, Karantén 2, Macskaszoba"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Típus *</label>
                <select value={type} onChange={e => setType(e.target.value as KennelType)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
                  {ALL_KENNEL_TYPES.map(t => <option key={t} value={t}>{KENNEL_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Maximális kapacitás *</label>
                <input required type="number" min={1} value={capacity}
                  onChange={e => setCapacity(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Megjegyzés</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Opcionális"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {saving ? "Mentés…" : "Férőhely létrehozása"}
            </button>
          </form>
        )}
      </div>

      {/* Kennelek rácsa */}
      {kennels.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          Még nincs létrehozott férőhely.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kennels.map(k => {
            const used = occupancy(k.id);
            const full = used >= k.capacity;
            const pct  = Math.min(100, Math.round((used / k.capacity) * 100));
            const here = animals.filter(a => a.kennelId === k.id);
            return (
              <div key={k.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{k.name}</h3>
                    <span className="text-xs text-gray-400">{KENNEL_TYPE_LABELS[k.type]}</span>
                  </div>
                  <button onClick={() => handleDelete(k.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs font-medium">
                  <span className={full ? "text-red-600" : "text-gray-600"}>
                    Foglaltság: {used}/{k.capacity}
                  </span>
                  <span className={full ? "text-red-500" : "text-green-600"}>
                    {full ? "Megtelt" : `${k.capacity - used} szabad`}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full transition-all ${full ? "bg-red-400" : "bg-brand-400"}`}
                    style={{ width: `${pct}%` }} />
                </div>

                {k.note && <p className="mt-2 text-xs text-gray-400">{k.note}</p>}

                {/* Bent lévő állatok */}
                <ul className="mt-3 space-y-1.5">
                  {here.length === 0 && <li className="text-xs text-gray-300">Üres</li>}
                  {here.map(a => (
                    <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
                      <span className="truncate text-xs font-medium text-gray-700">{a.name}</span>
                      <select value={a.kennelId ?? ""} onChange={e => handleMove(a.id, e.target.value || null)}
                        className="shrink-0 rounded-md border border-gray-200 bg-white px-1.5 py-1 text-xs outline-none">
                        <option value="">— Kivesz —</option>
                        {kennels.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Férőhely nélküli állatok */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-gray-400" />
          <h3 className="font-bold text-gray-900">Férőhely nélküli állatok</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            {unassigned.length}
          </span>
        </div>
        {unassigned.length === 0 ? (
          <p className="text-sm text-gray-400">Minden állat férőhelyhez van rendelve.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unassigned.map(a => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                <span className="truncate text-sm font-medium text-gray-700">{a.name}</span>
                <select defaultValue="" onChange={e => handleMove(a.id, e.target.value || null)}
                  className="shrink-0 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs outline-none">
                  <option value="">Férőhelyre…</option>
                  {kennels.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
