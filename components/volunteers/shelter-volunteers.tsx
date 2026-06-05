"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, X, UserMinus, Plus, ChevronDown, ChevronUp,
  CalendarDays, Clock, ClipboardList, Users, HandHeart,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VolunteerEntry {
  id:           string;
  status:       "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";
  motivation:   string | null;
  skills:       string | null;
  availability: string | null;
  adminNote:    string | null;
  createdAt:    string;
  user:         { name: string | null; email: string; phone?: string | null };
  attendances:  { id: string; date: string; hours: number; note: string | null }[];
  assignments:  { task: { title: string; scheduledAt: string; status: string } }[];
}

export interface TaskEntry {
  id:            string;
  title:         string;
  description:   string | null;
  scheduledAt:   string;
  maxVolunteers: number;
  status:        "OPEN" | "ASSIGNED" | "COMPLETED" | "CANCELLED";
  assignments:   { volunteer: { user: { name: string | null; email: string } } }[];
}

// ─── Status badges ────────────────────────────────────────────────────────────

const VOL_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Elbírálás alatt", color: "bg-amber-100 text-amber-700"  },
  ACTIVE:   { label: "Aktív",           color: "bg-green-100 text-green-700"  },
  INACTIVE: { label: "Inaktív",         color: "bg-gray-100 text-gray-500"    },
  REJECTED: { label: "Elutasítva",      color: "bg-red-100 text-red-600"      },
};
const TASK_STATUS: Record<string, { label: string; color: string }> = {
  OPEN:      { label: "Nyitott",    color: "bg-brand-100 text-brand-700" },
  ASSIGNED:  { label: "Betöltött",  color: "bg-blue-100 text-blue-700"   },
  COMPLETED: { label: "Elvégezve",  color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Lemondva",   color: "bg-gray-100 text-gray-500"   },
};

// ─── Single volunteer card ─────────────────────────────────────────────────────

function VolunteerCard({ vol }: { vol: VolunteerEntry }) {
  const router = useRouter();
  const [expanded,   setExpanded]   = useState(false);
  const [adminNote,  setAdminNote]  = useState(vol.adminNote ?? "");
  const [hours,      setHours]      = useState("2");
  const [atDate,     setAtDate]     = useState(new Date().toISOString().slice(0, 10));
  const [atNote,     setAtNote]     = useState("");
  const [loading,    setLoading]    = useState(false);

  const totalHours = vol.attendances.reduce((s, a) => s + a.hours, 0);
  const badge = VOL_STATUS[vol.status];

  async function setStatus(status: string) {
    setLoading(true);
    await fetch(`/api/volunteers/${vol.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote: adminNote || undefined }),
    });
    setLoading(false); router.refresh();
  }

  async function logAttendance() {
    if (!atDate || !hours) return;
    setLoading(true);
    await fetch(`/api/volunteers/${vol.id}/attendance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date:  new Date(atDate + "T12:00:00").toISOString(),
        hours: parseFloat(hours),
        note:  atNote || undefined,
      }),
    });
    setLoading(false); setAtNote(""); router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-500">
          {(vol.user.name ?? vol.user.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{vol.user.name ?? "Névtelen"}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>{badge.label}</span>
          </div>
          <p className="text-xs text-gray-500">{vol.user.email}</p>
          {vol.skills && <p className="mt-1 text-xs text-gray-400">Készségek: {vol.skills}</p>}
          {vol.availability && <p className="text-xs text-gray-400">Elérhetőség: {vol.availability}</p>}
          {totalHours > 0 && (
            <p className="mt-1 text-xs font-medium text-brand-600">{totalHours} óra teljesítve</p>
          )}
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-4">
          {vol.motivation && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span className="font-medium text-gray-700">Motiváció: </span>{vol.motivation}
            </p>
          )}

          {/* Admin note */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Admin megjegyzés</label>
            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
              rows={2} maxLength={500}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none focus:border-brand-400 resize-none" />
          </div>

          {/* Status actions */}
          {(vol.status === "PENDING" || vol.status === "ACTIVE") && (
            <div className="flex flex-wrap gap-2">
              {vol.status === "PENDING" && (
                <button onClick={() => setStatus("ACTIVE")} disabled={loading}
                  className="flex items-center gap-1 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 border border-green-200">
                  <Check className="h-3.5 w-3.5" /> Visszaigazol
                </button>
              )}
              {vol.status === "PENDING" && (
                <button onClick={() => setStatus("REJECTED")} disabled={loading}
                  className="flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 border border-red-200">
                  <X className="h-3.5 w-3.5" /> Elutasít
                </button>
              )}
              {vol.status === "ACTIVE" && (
                <button onClick={() => setStatus("INACTIVE")} disabled={loading}
                  className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                  <UserMinus className="h-3.5 w-3.5" /> Inaktívra állít
                </button>
              )}
            </div>
          )}

          {/* Attendance log (only for active) */}
          {vol.status === "ACTIVE" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Jelenlét naplózása</p>
              <div className="flex flex-wrap gap-2">
                <input type="date" value={atDate} onChange={e => setAtDate(e.target.value)}
                  className="flex-1 min-w-[130px] rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
                <input type="number" value={hours} onChange={e => setHours(e.target.value)}
                  min="0.5" max="24" step="0.5" placeholder="Óra"
                  className="w-20 rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
                <input value={atNote} onChange={e => setAtNote(e.target.value)} maxLength={200}
                  placeholder="Megjegyzés"
                  className="flex-1 min-w-[130px] rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
                <button onClick={logAttendance} disabled={loading}
                  className="flex items-center gap-1 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5" /> Naplóz
                </button>
              </div>

              {vol.attendances.length > 0 && (
                <div className="mt-2 rounded-xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                  {vol.attendances.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-gray-500">{new Date(a.date).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}</span>
                      <span className="font-medium text-gray-700">{a.hours} óra</span>
                      {a.note && <span className="text-gray-400 truncate max-w-[120px]">{a.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: TaskEntry }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const badge = TASK_STATUS[task.status];

  async function complete() {
    setLoading(true);
    await fetch(`/api/volunteer-tasks/${task.id}/complete`, { method: "POST" });
    setLoading(false); router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>{badge.label}</span>
            <span className="font-semibold text-gray-900">{task.title}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(task.scheduledAt).toLocaleDateString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {task.assignments.length}/{task.maxVolunteers} önkéntes
            </span>
          </div>
          {task.description && <p className="mt-1.5 text-xs text-gray-400">{task.description}</p>}
          {task.assignments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {task.assignments.map((a, i) => (
                <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {a.volunteer.user.name ?? a.volunteer.user.email}
                </span>
              ))}
            </div>
          )}
        </div>
        {(task.status === "OPEN" || task.status === "ASSIGNED") && (
          <button onClick={complete} disabled={loading}
            className="shrink-0 flex items-center gap-1 rounded-xl bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 border border-green-200 disabled:opacity-50">
            <Check className="h-3.5 w-3.5" /> Teljesítve
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Task creation form ───────────────────────────────────────────────────────

function NewTaskForm({ shelterId, onCreated }: { shelterId: string; onCreated: () => void }) {
  const router = useRouter();
  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [scheduledAt,   setScheduledAt]   = useState("");
  const [maxVolunteers, setMaxVolunteers] = useState("1");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !scheduledAt) return;
    setLoading(true); setError(null);
    const res = await fetch("/api/volunteer-tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shelterId,
        title,
        description: description || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        maxVolunteers: parseInt(maxVolunteers),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Hiba"); return; }
    setTitle(""); setDescription(""); setScheduledAt(""); setMaxVolunteers("1");
    onCreated(); router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-brand-100 bg-brand-50 p-5 space-y-3">
      <p className="text-sm font-semibold text-gray-800">Új feladat létrehozása</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <input required value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
            placeholder="Feladat neve *"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <input required type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <input type="number" value={maxVolunteers} onChange={e => setMaxVolunteers(e.target.value)}
            min="1" max="100" placeholder="Max önkéntes"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="sm:col-span-2">
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={2} maxLength={2000} placeholder="Leírás (opcionális)"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none" />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
        {loading ? "Mentés..." : "Feladat létrehozása"}
      </button>
    </form>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const TABS = ["Önkéntesek", "Feladatok"] as const;

interface Props {
  shelterId:  string;
  volunteers: VolunteerEntry[];
  tasks:      TaskEntry[];
}

export function ShelterVolunteers({ shelterId, volunteers, tasks }: Props) {
  const [tab,         setTab]         = useState<(typeof TABS)[number]>("Önkéntesek");
  const [showNewTask, setShowNewTask] = useState(false);
  const [volFilter,   setVolFilter]   = useState<string>("ALL");

  const filteredVols = volFilter === "ALL" ? volunteers : volunteers.filter(v => v.status === volFilter);
  const pending = volunteers.filter(v => v.status === "PENDING").length;

  return (
    <div>
      {/* Tab strip */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-brand-500 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-brand-200"
              }`}>
              {t === "Önkéntesek" ? <HandHeart className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
              {t}
              {t === "Önkéntesek" && pending > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">{pending}</span>
              )}
            </button>
          ))}
        </div>
        {tab === "Feladatok" && (
          <button onClick={() => setShowNewTask(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" />
            Új feladat
          </button>
        )}
      </div>

      {tab === "Önkéntesek" && (
        <div>
          {/* Filter */}
          <div className="mb-4 flex flex-wrap gap-2">
            {["ALL", "PENDING", "ACTIVE", "INACTIVE", "REJECTED"].map(f => (
              <button key={f} onClick={() => setVolFilter(f)}
                className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                  volFilter === f ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                {f === "ALL" ? "Összes" : VOL_STATUS[f]?.label ?? f}
              </button>
            ))}
          </div>

          {filteredVols.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <HandHeart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400">Nincs önkéntes ebben a kategóriában.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVols.map(v => <VolunteerCard key={v.id} vol={v} />)}
            </div>
          )}
        </div>
      )}

      {tab === "Feladatok" && (
        <div className="space-y-4">
          {showNewTask && (
            <NewTaskForm shelterId={shelterId} onCreated={() => setShowNewTask(false)} />
          )}
          {tasks.length === 0 && !showNewTask ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400">Még nincs feladat. Hozz létre egyet!</p>
            </div>
          ) : (
            tasks.map(t => <TaskCard key={t.id} task={t} />)
          )}
        </div>
      )}
    </div>
  );
}
