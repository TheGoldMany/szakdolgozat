"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HandHeart, CheckCircle, Clock, XCircle, AlertCircle,
  CalendarDays, Star, ChevronDown, ChevronUp, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Attendance {
  id:        string;
  date:      string;
  hours:     number;
  note:      string | null;
}

interface TaskAssignment {
  id:        string;
  createdAt: string;
  task: {
    id:          string;
    title:       string;
    description: string | null;
    scheduledAt: string;
    status:      string;
    shelterId:   string;
  };
}

interface Volunteer {
  id:           string;
  shelterId:    string;
  status:       string;
  motivation:   string | null;
  skills:       string | null;
  availability: string | null;
  adminNote:    string | null;
  createdAt:    string;
  shelter:      { id: string; name: string; slug: string; city: string };
  assignments:  TaskAssignment[];
  attendances:  Attendance[];
}

interface AvailableTask {
  id:           string;
  title:        string;
  description:  string | null;
  scheduledAt:  string;
  status:       string;
  maxVolunteers: number;
  shelterId:    string;
  shelter:      { name: string };
  assignments:  { volunteer: { userId: string } }[];
}

interface Props {
  data: {
    volunteers:     Volunteer[];
    availableTasks: AvailableTask[];
    userId:         string;
  };
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING:  { label: "Elbírálás alatt", color: "bg-amber-50  text-amber-700  border-amber-200",  icon: Clock },
  ACTIVE:   { label: "Aktív önkéntes",  color: "bg-green-50  text-green-700  border-green-200",  icon: CheckCircle },
  INACTIVE: { label: "Inaktív",         color: "bg-gray-100  text-gray-500   border-gray-200",   icon: AlertCircle },
  REJECTED: { label: "Elutasítva",      color: "bg-red-50    text-red-600    border-red-200",    icon: XCircle },
};

// ── Volunteer card ─────────────────────────────────────────────────────────────

function VolunteerCard({ vol, userId }: { vol: Volunteer; userId: string }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[vol.status] ?? STATUS_CFG.PENDING;
  const Icon = cfg.icon;

  const totalHours = vol.attendances.reduce((s, a) => s + a.hours, 0);
  const myTaskIds  = new Set(vol.assignments.map((a) => a.task.id));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="font-semibold text-gray-800">{vol.shelter.name}</p>
          <p className="text-xs text-gray-400">{vol.shelter.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", cfg.color)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">

          {/* Stats row */}
          {vol.status === "ACTIVE" && (
            <div className="flex gap-6 px-4 py-3">
              <div className="text-center">
                <p className="text-xl font-bold text-brand-600">{totalHours}</p>
                <p className="text-xs text-gray-400">ledolgozott óra</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-gray-700">{vol.assignments.length}</p>
                <p className="text-xs text-gray-400">elvállalt feladat</p>
              </div>
            </div>
          )}

          {/* Motivation / skills */}
          {(vol.motivation || vol.skills || vol.availability) && (
            <div className="px-4 py-3 space-y-1.5">
              {vol.motivation && (
                <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Motiváció:</span> {vol.motivation}</p>
              )}
              {vol.skills && (
                <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Készségek:</span> {vol.skills}</p>
              )}
              {vol.availability && (
                <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Elérhetőség:</span> {vol.availability}</p>
              )}
            </div>
          )}

          {/* Admin note */}
          {vol.adminNote && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 italic">Menhely megjegyzése: {vol.adminNote}</p>
            </div>
          )}

          {/* Assigned tasks */}
          {vol.assignments.length > 0 && (
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Elvállalt feladatok</p>
              <div className="space-y-2">
                {vol.assignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-700">{a.task.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(a.task.scheduledAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      a.task.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      a.task.status === "ASSIGNED"  ? "bg-blue-100  text-blue-700"  :
                                                      "bg-gray-100  text-gray-600"
                    )}>
                      {a.task.status === "COMPLETED" ? "Kész" : a.task.status === "ASSIGNED" ? "Elvállalt" : "Nyitott"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent attendance */}
          {vol.attendances.length > 0 && (
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Jelenléti napló</p>
              <div className="space-y-1.5">
                {vol.attendances.slice(0, 5).map((att) => (
                  <div key={att.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {new Date(att.date).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                    </span>
                    <span className="font-medium text-gray-700">{att.hours} óra</span>
                    {att.note && <span className="max-w-[160px] truncate text-gray-400">{att.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Available task card ────────────────────────────────────────────────────────

function AvailableTaskCard({ task, userId, onSignup }: {
  task:     AvailableTask;
  userId:   string;
  onSignup: (taskId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const alreadySigned = task.assignments.some((a) => a.volunteer.userId === userId);
  const spots         = task.maxVolunteers - task.assignments.length;

  async function handleSignup() {
    setLoading(true); setError(null);
    try {
      await onSignup(task.id);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800">{task.title}</p>
          <p className="text-xs text-gray-400">{task.shelter.name}</p>
          {task.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(task.scheduledAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
            <span>{spots} hely szabad</span>
          </div>
        </div>

        {done || alreadySigned ? (
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
            <CheckCircle className="h-3.5 w-3.5" /> Elvállalt
          </span>
        ) : (
          <button
            onClick={handleSignup}
            disabled={loading || spots <= 0}
            className="shrink-0 rounded-xl bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "..." : spots <= 0 ? "Betelt" : "Elvállalom"}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

export function VolunteerDashboard({ data }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(data.availableTasks);

  async function handleSignup(taskId: string) {
    const res = await fetch(`/api/volunteer-tasks/${taskId}/assign`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error ?? "Hiba");
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, assignments: [...t.assignments, { volunteer: { userId: data.userId } }] }
          : t
      )
    );
    router.refresh();
  }

  const totalHours = data.volunteers.reduce(
    (sum, v) => sum + v.attendances.reduce((s, a) => s + a.hours, 0),
    0
  );
  const activeCount = data.volunteers.filter((v) => v.status === "ACTIVE").length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <HandHeart className="h-7 w-7 text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Önkéntességem</h1>
          <p className="text-sm text-gray-500">Önkéntes tevékenységeid és feladataid</p>
        </div>
      </div>

      {/* Summary strip */}
      {data.volunteers.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-brand-600">{activeCount}</p>
            <p className="text-xs text-gray-500">Aktív menhely</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-700">{totalHours}</p>
            <p className="text-xs text-gray-500">Ledolgozott óra</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-700">
              {data.volunteers.reduce((s, v) => s + v.assignments.length, 0)}
            </p>
            <p className="text-xs text-gray-500">Elvállalt feladat</p>
          </div>
        </div>
      )}

      {/* No applications yet */}
      {data.volunteers.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <HandHeart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">Még nem jelentkeztél önkéntesnek</p>
          <p className="mt-1 text-sm text-gray-400">
            Böngéssz a menhelyek között és kattints az "Önkéntesnek jelentkezem" gombra.
          </p>
          <a
            href="/shelters"
            className="mt-4 inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Menhelyek böngészése
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Volunteer applications */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Menhelyek ({data.volunteers.length})
            </h2>
            <div className="space-y-3">
              {data.volunteers.map((v) => (
                <VolunteerCard key={v.id} vol={v} userId={data.userId} />
              ))}
            </div>
          </section>

          {/* Available tasks */}
          {tasks.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Elérhető feladatok ({tasks.length})
              </h2>
              <div className="space-y-3">
                {tasks.map((t) => (
                  <AvailableTaskCard
                    key={t.id}
                    task={t}
                    userId={data.userId}
                    onSignup={handleSignup}
                  />
                ))}
              </div>
            </section>
          )}

          {activeCount > 0 && tasks.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">Jelenleg nincs nyitott feladat a menhelyeidnél.</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
