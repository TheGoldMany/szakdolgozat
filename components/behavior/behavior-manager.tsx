"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, X, Trash2, Save, TrendingUp } from "lucide-react";
import { FLAG_LABELS, ALL_FLAGS } from "@/lib/behavior";
import type { AnimalFlag } from "@prisma/client";

interface BehaviorEntry {
  id:            string;
  note:          string;
  progressLevel: number | null;
  createdAt:     string;
  author:        { name: string | null } | null;
}

interface Props {
  animalId:             string;
  initialFlags:         AnimalFlag[];
  initialProgressLevel: number | null;
  initialLogs:          BehaviorEntry[];
}

export function BehaviorManager({
  animalId, initialFlags, initialProgressLevel, initialLogs,
}: Props) {
  const router = useRouter();

  // ── Flags + progress ──────────────────────────────────────────────
  const [flags, setFlags]               = useState<AnimalFlag[]>(initialFlags);
  const [progress, setProgress]         = useState<number>(initialProgressLevel ?? 0);
  const [savingFlags, setSavingFlags]   = useState(false);
  const [flagsDirty, setFlagsDirty]     = useState(false);

  // ── Log form ──────────────────────────────────────────────────────
  const [logs, setLogs]         = useState<BehaviorEntry[]>(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [note, setNote]         = useState("");
  const [withProgress, setWithProgress] = useState(false);
  const [logProgress, setLogProgress]   = useState<number>(progress);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function toggleFlag(f: AnimalFlag) {
    setFlagsDirty(true);
    setFlags(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  async function saveFlags() {
    setSavingFlags(true);
    const res = await fetch(`/api/animals/${animalId}/flags`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ flags, progressLevel: progress }),
    });
    setSavingFlags(false);
    if (res.ok) { setFlagsDirty(false); router.refresh(); }
  }

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/animals/${animalId}/behavior`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        note,
        progressLevel: withProgress ? logProgress : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Hiba"); return; }
    setLogs(prev => [data as BehaviorEntry, ...prev]);
    if (withProgress) setProgress(logProgress);
    setShowForm(false); setNote(""); setWithProgress(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd ezt a bejegyzést?")) return;
    await fetch(`/api/animals/${animalId}/behavior/${id}`, { method: "DELETE" });
    setLogs(prev => prev.filter(r => r.id !== id));
    router.refresh();
  }

  const progressColor =
    progress >= 75 ? "bg-green-500" :
    progress >= 40 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="space-y-8">
      {/* ── Belső flag-ek ─────────────────────────────────────────── */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-base font-bold text-gray-900">Belső biztonsági címkék</h2>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Csak a menhely munkatársai látják. Segít felhívni a kollégák figyelmét a kockázatokra,
          és figyelmeztetést jelenít meg az ütköző örökbefogadási kérelmeknél.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_FLAGS.map(f => {
            const active = flags.includes(f);
            return (
              <button key={f} type="button" onClick={() => toggleFlag(f)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-amber-200"
                }`}
              >
                {FLAG_LABELS[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Fejlődési szint ───────────────────────────────────────── */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-500" />
          <h2 className="text-base font-bold text-gray-900">Rehabilitációs fejlődési szint</h2>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Szubjektív becslés az állat fejlődéséről (0–100%).
        </p>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={100} value={progress}
            onChange={e => { setProgress(Number(e.target.value)); setFlagsDirty(true); }}
            className="flex-1 accent-brand-500" />
          <span className="w-12 text-right text-sm font-bold text-gray-800">{progress}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {flagsDirty && (
        <button onClick={saveFlags} disabled={savingFlags}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
          <Save className="h-4 w-4" />
          {savingFlags ? "Mentés…" : "Címkék és szint mentése"}
        </button>
      )}

      {/* ── Napló ─────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Viselkedési és tréning napló</h2>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Mégse" : "Bejegyzés hozzáadása"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddLog} className="mb-6 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <label className="mb-1 block text-xs font-semibold text-gray-600">Bejegyzés *</label>
            <textarea required value={note} onChange={e => setNote(e.target.value)}
              rows={3} placeholder="pl. Pórázhoz szoktatás ma jól ment, kevésbé húzott."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none" />

            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-600">
              <input type="checkbox" checked={withProgress} onChange={e => setWithProgress(e.target.checked)}
                className="accent-brand-500" />
              Fejlődési szint rögzítése ehhez a bejegyzéshez
            </label>
            {withProgress && (
              <div className="mt-2 flex items-center gap-3">
                <input type="range" min={0} max={100} value={logProgress}
                  onChange={e => setLogProgress(Number(e.target.value))}
                  className="flex-1 accent-brand-500" />
                <span className="w-12 text-right text-sm font-bold text-gray-800">{logProgress}%</span>
              </div>
            )}

            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {loading ? "Mentés…" : "Bejegyzés mentése"}
            </button>
          </form>
        )}

        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            Még nincs viselkedési bejegyzés.
          </p>
        ) : (
          <ol className="relative border-l border-gray-200 pl-5">
            {logs.map(r => (
              <li key={r.id} className="mb-5 last:mb-0">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-400" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{r.note}</p>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>{new Date(r.createdAt).toLocaleDateString("hu-HU")}</span>
                      {r.progressLevel !== null && (
                        <span className="text-brand-600">Fejlődés: {r.progressLevel}%</span>
                      )}
                      {r.author?.name && <span>Rögzítette: {r.author.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
