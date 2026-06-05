"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, User, PawPrint, Phone, Mail, Check, X, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";

interface ApptUser {
  name:  string | null;
  email: string;
  phone: string | null;
}

interface AdminAppointment {
  id:          string;
  status:      "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  proposedAt:  string;
  confirmedAt: string | null;
  note:        string | null;
  adminNote:   string | null;
  cancelledBy: string | null;
  user:        ApptUser;
  animal:      { name: string; slug: string } | null;
  shelter:     { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING:   "Függőben",
  CONFIRMED: "Visszaigazolt",
  CANCELLED: "Lemondva",
  COMPLETED: "Teljesítve",
};

function AdminApptCard({ appt }: { appt: AdminAppointment }) {
  const router = useRouter();
  const [expanded,     setExpanded]     = useState(false);
  const [adminNote,    setAdminNote]    = useState(appt.adminNote ?? "");
  const [confirmedAt,  setConfirmedAt]  = useState(appt.confirmedAt ? new Date(appt.confirmedAt).toISOString().slice(0, 16) : new Date(appt.proposedAt).toISOString().slice(0, 16));
  const [loading,      setLoading]      = useState(false);

  async function act(action: string, extra?: object) {
    setLoading(true);
    await fetch(`/api/appointments/${appt.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, adminNote: adminNote || undefined, ...extra }),
    });
    setLoading(false);
    router.refresh();
  }

  const displayTime = appt.confirmedAt ?? appt.proposedAt;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[appt.status]}`}>
              {STATUS_LABEL[appt.status]}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(displayTime).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <User  className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-medium text-gray-700">{appt.user.name ?? "Névtelen"}</span>
            </div>
            {appt.user.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />{appt.user.email}
              </div>
            )}
            {appt.user.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />{appt.user.phone}
              </div>
            )}
            {appt.animal && (
              <div className="flex items-center gap-1.5">
                <PawPrint className="h-3.5 w-3.5 text-gray-400" />{appt.animal.name}
              </div>
            )}
          </div>

          {appt.note && (
            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <span className="font-medium">Üzenet:</span> {appt.note}
            </p>
          )}
          {appt.adminNote && (
            <p className="mt-1.5 text-xs text-gray-400">
              Válaszod: {appt.adminNote}
            </p>
          )}
        </div>

        {appt.status === "PENDING" && (
          <button onClick={() => setExpanded(v => !v)}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        {appt.status === "CONFIRMED" && (
          <button onClick={() => act("COMPLETE")} disabled={loading}
            className="shrink-0 flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors">
            <CheckCheck className="h-3.5 w-3.5" /> Teljesítve
          </button>
        )}
      </div>

      {/* Expand panel for PENDING */}
      {expanded && appt.status === "PENDING" && (
        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Visszaigazolt időpont</label>
            <input type="datetime-local" value={confirmedAt} onChange={e => setConfirmedAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Válasz az érdeklődőnek (opcionális)</label>
            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
              rows={2} maxLength={500} placeholder="Pl. Nagyon várjuk! Hozzák el az iratokat."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => act("CONFIRM", { confirmedAt: new Date(confirmedAt).toISOString() })}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 transition-colors">
              <Check className="h-4 w-4" /> Visszaigazol
            </button>
            <button onClick={() => act("REJECT")} disabled={loading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors border border-red-200">
              <X className="h-4 w-4" /> Elutasít
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  initial: AdminAppointment[];
}

const TABS = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const TAB_LABEL: Record<string, string> = {
  PENDING:   "Függőben",
  CONFIRMED: "Visszaigazolt",
  COMPLETED: "Teljesítve",
  CANCELLED: "Lemondva",
};

export function ShelterAppointments({ initial }: Props) {
  const [tab, setTab] = useState<string>("PENDING");

  const filtered = initial.filter(a => a.status === tab);

  return (
    <div>
      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(t => {
          const count = initial.filter(a => a.status === t).length;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-brand-200"
              }`}>
              {TAB_LABEL[t]} {count > 0 && <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          Nincs {TAB_LABEL[tab].toLowerCase()} időpont.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => <AdminApptCard key={a.id} appt={a} />)}
        </div>
      )}
    </div>
  );
}
