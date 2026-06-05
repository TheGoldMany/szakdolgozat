"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Syringe, Stethoscope, Scissors, HeartPulse, Bug, ClipboardCheck, Trash2, Plus, X } from "lucide-react";

const TYPES = [
  { value: "VACCINATION", label: "Oltás",               icon: Syringe       },
  { value: "TREATMENT",   label: "Kezelés",             icon: HeartPulse    },
  { value: "VET_VISIT",   label: "Állatorvos látogatás", icon: Stethoscope   },
  { value: "SURGERY",     label: "Műtét",               icon: Scissors      },
  { value: "DEWORMING",   label: "Féreghajtás",         icon: Bug           },
  { value: "CHECKUP",     label: "Általános vizsgálat", icon: ClipboardCheck },
];

const TYPE_COLOR: Record<string, string> = {
  VACCINATION: "text-blue-600 bg-blue-50",
  TREATMENT:   "text-red-600 bg-red-50",
  VET_VISIT:   "text-green-600 bg-green-50",
  SURGERY:     "text-purple-600 bg-purple-50",
  DEWORMING:   "text-orange-600 bg-orange-50",
  CHECKUP:     "text-gray-600 bg-gray-50",
};

interface HealthEntry {
  id:          string;
  type:        string;
  title:       string;
  description: string | null;
  date:        string;
  nextDueDate: string | null;
  vetName:     string | null;
  createdBy:   { name: string | null } | null;
}

interface Props {
  animalId: string;
  initial:  HealthEntry[];
}

export function HealthManager({ animalId, initial }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<HealthEntry[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const [type,        setType]        = useState("VACCINATION");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [date,        setDate]        = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState("");
  const [vetName,     setVetName]     = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/animals/${animalId}/health`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        type, title,
        description: description || undefined,
        date:        new Date(date).toISOString(),
        nextDueDate: nextDueDate ? new Date(nextDueDate).toISOString() : undefined,
        vetName:     vetName || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Hiba"); return; }
    setRecords(prev => [data as HealthEntry, ...prev]);
    setShowForm(false);
    setTitle(""); setDescription(""); setNextDueDate(""); setVetName("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd?")) return;
    await fetch(`/api/animals/${animalId}/health/${id}`, { method: "DELETE" });
    setRecords(prev => prev.filter(r => r.id !== id));
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900">Egészségügyi napló</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Mégse" : "Bejegyzés hozzáadása"}
        </button>
      </div>

      {/* Hozzáadó form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Típus */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Típus *</label>
              <div className="flex flex-wrap gap-2">
                {TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button key={t.value} type="button"
                      onClick={() => setType(t.value)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                        type === t.value
                          ? "border-brand-500 bg-white text-brand-600 shadow-sm"
                          : "border-gray-200 bg-white text-gray-500 hover:border-brand-200"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cím */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Megnevezés *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="pl. Veszettség elleni oltás"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>

            {/* Dátum */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Dátum *</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>

            {/* Következő időpont */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Következő esedékesség</label>
              <input type="date" value={nextDueDate} onChange={e => setNextDueDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>

            {/* Állatorvos */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Állatorvos neve</label>
              <input value={vetName} onChange={e => setVetName(e.target.value)}
                placeholder="Dr. Kiss Péter"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            </div>

            {/* Megjegyzés */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Megjegyzés</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                rows={2} placeholder="Részletek, megfigyelések…"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none" />
            </div>
          </div>

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-4 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {loading ? "Mentés…" : "Bejegyzés mentése"}
          </button>
        </form>
      )}

      {/* Lista */}
      {records.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          Még nincs egészségügyi bejegyzés.
        </p>
      ) : (
        <ol className="relative border-l border-gray-200 pl-5">
          {records.map(r => {
            const cfg = TYPES.find(t => t.value === r.type);
            const Icon = cfg?.icon ?? ClipboardCheck;
            const color = TYPE_COLOR[r.type] ?? "text-gray-600 bg-gray-50";
            return (
              <li key={r.id} className="mb-5 last:mb-0">
                <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${color.split(" ")[1]}`}>
                  <Icon className={`h-3 w-3 ${color.split(" ")[0]}`} />
                </span>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
                        {cfg?.label ?? r.type}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{r.title}</span>
                    </div>
                    {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>{new Date(r.date).toLocaleDateString("hu-HU")}</span>
                      {r.vetName     && <span>Dr. {r.vetName}</span>}
                      {r.nextDueDate && <span className="text-amber-600">Következő: {new Date(r.nextDueDate).toLocaleDateString("hu-HU")}</span>}
                      {r.createdBy?.name && <span>Rögzítette: {r.createdBy.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(r.id)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
