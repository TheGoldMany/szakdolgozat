"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Plus, X, Trash2, CalendarHeart, MapPin, Users, AlertTriangle,
  ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import {
  EVENT_TYPE_LABELS, ALL_EVENT_TYPES, EVENT_TYPE_COLORS,
  EVENT_STATUS_LABELS, EVENT_STATUS_COLORS,
} from "@/lib/event";
import type { EventType, EventStatus } from "@prisma/client";

export interface RegistrationEntry {
  id:        string;
  status:    string;
  guests:    number;
  note:      string | null;
  createdAt: string;
  user:      { name: string | null; email: string };
}
export interface EventEntry {
  id:          string;
  title:       string;
  slug:        string;
  description: string;
  type:        EventType;
  location:    string;
  startsAt:    string;
  endsAt:      string | null;
  capacity:    number | null;
  imageUrl:    string | null;
  status:      EventStatus;
  registrations: RegistrationEntry[];
}

interface Props {
  shelterId: string;
  events:    EventEntry[];
}

const EMPTY = {
  title: "", type: "ADOPTION_DAY" as EventType, location: "", description: "",
  startsAt: "", endsAt: "", capacity: "", imageUrl: "",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("hu-HU", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function EventsManager({ shelterId, events }: Props) {
  const t = useTranslations('events');
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function openCreate() {
    setEditId(null); setForm({ ...EMPTY }); setError(null); setShowForm(true);
  }
  function openEdit(ev: EventEntry) {
    setEditId(ev.id);
    setForm({
      title: ev.title, type: ev.type, location: ev.location, description: ev.description,
      startsAt: ev.startsAt.slice(0, 16), endsAt: ev.endsAt ? ev.endsAt.slice(0, 16) : "",
      capacity: ev.capacity != null ? String(ev.capacity) : "", imageUrl: ev.imageUrl ?? "",
    });
    setError(null); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    setSaving(true); setError(null);

    const payload = {
      title:       form.title,
      type:        form.type,
      location:    form.location,
      description: form.description,
      startsAt:    new Date(form.startsAt).toISOString(),
      endsAt:      form.endsAt ? new Date(form.endsAt).toISOString() : null,
      capacity:    form.capacity ? Number(form.capacity) : null,
      imageUrl:    form.imageUrl || undefined,
    };

    const res = editId
      ? await fetch(`/api/events/${editId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, ...(publish ? { status: "PUBLISHED" } : {}) }),
        })
      : await fetch("/api/events", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, shelterId, publish }),
        });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Hiba történt"); return; }
    setShowForm(false); setEditId(null); setForm({ ...EMPTY });
    router.refresh();
  }

  async function changeStatus(id: string, status: EventStatus) {
    setError(null);
    const res = await fetch(`/api/events/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Hiba"); return; }
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd az eseményt? A jelentkezések is törlődnek.")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div>
        <button onClick={() => (showForm ? setShowForm(false) : openCreate())}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? t('cancel') : t('newEvent')}
        </button>

        {showForm && (
          <form onSubmit={e => handleSubmit(e, false)} className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <p className="mb-4 font-semibold text-gray-800">{editId ? t('editEvent') : t('newEvent')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Cím *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="pl. Tavaszi örökbefogadási nap"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Típus *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
                  {ALL_EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Helyszín *</label>
                <input required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="pl. Városliget, Budapest"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Kezdés *</label>
                <input required type="datetime-local" value={form.startsAt}
                  onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Befejezés</label>
                <input type="datetime-local" value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Létszámkorlát</label>
                <input type="number" min={1} value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  placeholder="Üres = korlátlan"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Kép URL</label>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Leírás *</label>
                <textarea required rows={4} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Mi vár a látogatókra? Program, részletek…"
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="submit" disabled={saving}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors">
                {saving ? "Mentés…" : "Mentés vázlatként"}
              </button>
              <button type="button" disabled={saving} onClick={e => handleSubmit(e as React.FormEvent, true)}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
                {saving ? "Mentés…" : "Mentés és közzététel"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          Még nincs létrehozott esemény.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const active = ev.registrations.filter(r => r.status === "REGISTERED");
            const heads  = active.reduce((s, r) => s + 1 + r.guests, 0);
            const isOpen = expanded === ev.id;
            return (
              <div key={ev.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{ev.title}</h3>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${EVENT_TYPE_COLORS[ev.type]}`}>
                        {EVENT_TYPE_LABELS[ev.type]}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${EVENT_STATUS_COLORS[ev.status]}`}>
                        {EVENT_STATUS_LABELS[ev.status]}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><CalendarHeart className="h-3.5 w-3.5" />{fmtDate(ev.startsAt)}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ev.location}</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {heads}{ev.capacity != null ? ` / ${ev.capacity}` : ""} fő
                      </span>
                    </div>
                  </div>
                  <button onClick={() => openEdit(ev)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-brand-500 transition-colors" title="Szerkesztés">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-50 pt-3">
                  {ev.status === "DRAFT" && (
                    <button onClick={() => changeStatus(ev.id, "PUBLISHED")}
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 transition-colors">
                      Közzététel
                    </button>
                  )}
                  {ev.status === "PUBLISHED" && (
                    <>
                      <button onClick={() => changeStatus(ev.id, "DRAFT")}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Visszavonás vázlatba
                      </button>
                      <button onClick={() => changeStatus(ev.id, "COMPLETED")}
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                        Lezárás
                      </button>
                      <button onClick={() => changeStatus(ev.id, "CANCELLED")}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        Lemondás
                      </button>
                    </>
                  )}
                  {(ev.status === "CANCELLED" || ev.status === "COMPLETED") && (
                    <button onClick={() => changeStatus(ev.id, "DRAFT")}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      Újranyitás (vázlat)
                    </button>
                  )}
                  <button onClick={() => setExpanded(isOpen ? null : ev.id)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    Jelentkezők ({active.length})
                    {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(ev.id)}
                    className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Törlés">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Registrants */}
                {isOpen && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3">
                    {active.length === 0 ? (
                      <p className="text-xs text-gray-400">Még nincs jelentkező.</p>
                    ) : (
                      <ul className="space-y-2">
                        {active.map(r => (
                          <li key={r.id} className="flex items-start justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-700">{r.user.name ?? r.user.email}</p>
                              <p className="text-gray-400">{r.user.email}</p>
                              {r.note && <p className="mt-0.5 text-gray-500 italic">„{r.note}"</p>}
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-gray-500">
                              {1 + r.guests} fő
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
