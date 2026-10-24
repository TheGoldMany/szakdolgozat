"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ExternalLink, MapPinOff, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ReportType   = "LOST" | "FOUND" | "STRAY";
type ReportStatus = "ACTIVE" | "RESOLVED" | "CLOSED";
type AnimalType   = "DOG" | "CAT" | "RABBIT" | "BIRD" | "OTHER";

export interface AdminReport {
  id:           string;
  type:         ReportType;
  status:       ReportStatus;
  animalType:   AnimalType;
  name:         string | null;
  breed:        string | null;
  color:        string | null;
  gender:       string | null;
  description:  string;
  city:         string;
  address:      string | null;
  lat:          number | null;
  lng:          number | null;
  contactName:  string;
  contactPhone: string | null;
  contactEmail: string;
  thumb:        string | null;
  imageCount:   number;
  createdAt:    string;
}

const TYPE_LABEL: Record<ReportType, string>     = { LOST: "Elveszett", FOUND: "Talált", STRAY: "Kóbor" };
const TYPE_CLS:   Record<ReportType, string>     = { LOST: "bg-red-600 text-white", FOUND: "bg-brand-700 text-white", STRAY: "bg-amber-400 text-amber-950" };
const STATUS_LABEL: Record<ReportStatus, string> = { ACTIVE: "Aktív", RESOLVED: "Megoldva", CLOSED: "Lezárt" };
const ANIMAL_LABEL: Record<AnimalType, string>   = { DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb" };

const cls = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";
const labelCls = "mb-1 block text-xs font-semibold text-gray-600";

/** Ékezet- és kisbetű-független keresés: „lajosmizse” megtalálja a „Lajosmizse”-t. */
function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ReportsManager({ initial }: { initial: AdminReport[] }) {
  const [reports, setReports] = useState(initial);
  const [q, setQ]             = useState("");
  const [type, setType]       = useState<"" | ReportType>("");
  const [status, setStatus]   = useState<"" | ReportStatus>("");
  const [editing, setEditing] = useState<AdminReport | null>(null);
  const [deleting, setDeleting] = useState<AdminReport | null>(null);

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return reports.filter((r) =>
      (!type || r.type === type) &&
      (!status || r.status === status) &&
      (!needle || [r.name, r.breed, r.city, r.address, r.contactName, r.contactEmail, r.contactPhone, r.description]
        .some((f) => norm(f).includes(needle))));
  }, [reports, q, type, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keresés: név, település, bejelentő, leírás…"
            className={cn(cls, "pl-9")} />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value as "" | ReportType)} className={cn(cls, "sm:w-40")}>
          <option value="">Minden típus</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as "" | ReportStatus)} className={cn(cls, "sm:w-40")}>
          <option value="">Minden állapot</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} találat</p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          {reports.length === 0 ? "Még nincs bejelentés." : "Nincs a szűrésnek megfelelő bejelentés."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id} className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {r.thumb && <Image src={r.thumb} alt="" fill className="object-cover" sizes="80px" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TYPE_CLS[r.type])}>{TYPE_LABEL[r.type]}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    r.status === "ACTIVE" ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-600")}>{STATUS_LABEL[r.status]}</span>
                  {(r.lat == null || r.lng == null) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800" title="Nem jelenik meg a térképen">
                      <MapPinOff className="h-3 w-3" /> Nincs a térképen
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                  {r.name || "Névtelen"} <span className="font-normal text-gray-500">· {ANIMAL_LABEL[r.animalType]}{r.breed ? `, ${r.breed}` : ""}</span>
                </p>
                <p className="truncate text-xs text-gray-600">{r.city}{r.address ? `, ${r.address}` : ""}</p>
                <p className="truncate text-xs text-gray-500">
                  {r.contactName}{r.contactPhone ? ` · ${r.contactPhone}` : ""} · {new Date(r.createdAt).toLocaleDateString("hu-HU")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <a href={`/reports/${r.id}`} target="_blank" rel="noopener" title="Megnyitás"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"><ExternalLink className="h-4 w-4" /></a>
                <button type="button" onClick={() => setEditing(r)} title="Szerkesztés"
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-700"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => setDeleting(r)} title="Törlés"
                  className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditDialog report={editing} onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setReports((list) => list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            setEditing(null);
          }} />
      )}
      {deleting && (
        <DeleteDialog report={deleting} onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            setReports((list) => list.filter((r) => r.id !== id));
            setDeleting(null);
          }} />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Bezárás" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditDialog({ report, onClose, onSaved }: {
  report: AdminReport; onClose: () => void; onSaved: (r: Partial<AdminReport> & { id: string }) => void;
}) {
  const [form, setForm] = useState({
    type: report.type, status: report.status, animalType: report.animalType,
    name: report.name ?? "", breed: report.breed ?? "", color: report.color ?? "", gender: report.gender ?? "",
    description: report.description, city: report.city, address: report.address ?? "",
    contactName: report.contactName, contactPhone: report.contactPhone ?? "", contactEmail: report.contactEmail,
  });
  const [regeocode, setRegeocode] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const locationChanged = form.city !== report.city || form.address !== (report.address ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const empty = (s: string) => (s.trim() === "" ? null : s.trim());
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name: empty(form.name), breed: empty(form.breed), color: empty(form.color), gender: empty(form.gender),
          address: empty(form.address), contactPhone: empty(form.contactPhone),
          regeocode: regeocode || locationChanged,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Nem sikerült menteni.");
      toast.success(body.regeocoded ? "Mentve, a térképes hely is frissült." : "Mentve.");
      onSaved({ ...body.report, createdAt: report.createdAt, thumb: report.thumb, imageCount: report.imageCount });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nem sikerült menteni.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Bejelentés szerkesztése" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div><label className={labelCls}>Típus</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value as ReportType)} className={cls}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label className={labelCls}>Állapot</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value as ReportStatus)} className={cls}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label className={labelCls}>Faj</label>
            <select value={form.animalType} onChange={(e) => set("animalType", e.target.value as AnimalType)} className={cls}>
              {Object.entries(ANIMAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Név</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={cls} maxLength={100} /></div>
          <div><label className={labelCls}>Fajta</label><input value={form.breed} onChange={(e) => set("breed", e.target.value)} className={cls} maxLength={100} /></div>
          <div><label className={labelCls}>Szín</label><input value={form.color} onChange={(e) => set("color", e.target.value)} className={cls} maxLength={100} /></div>
          <div><label className={labelCls}>Nem</label><input value={form.gender} onChange={(e) => set("gender", e.target.value)} className={cls} maxLength={20} /></div>
        </div>
        <div><label className={labelCls}>Leírás</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} required maxLength={5000} className={cls} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Település</label><input value={form.city} onChange={(e) => set("city", e.target.value)} required className={cls} maxLength={100} /></div>
          <div><label className={labelCls}>Cím</label><input value={form.address} onChange={(e) => set("address", e.target.value)} className={cls} maxLength={200} /></div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={regeocode || locationChanged} disabled={locationChanged}
            onChange={(e) => setRegeocode(e.target.checked)} />
          Térképes hely újrakeresése a címből{locationChanged ? " (a cím változott, ezért automatikus)" : ""}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Bejelentő neve</label><input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} required className={cls} maxLength={100} /></div>
          <div><label className={labelCls}>Telefon</label><input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} className={cls} maxLength={40} /></div>
        </div>
        <div><label className={labelCls}>E-mail</label><input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} required className={cls} maxLength={200} /></div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Mégse</Button>
          <Button type="submit" className="flex-1" loading={saving}>Mentés</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({ report, onClose, onDeleted }: { report: AdminReport; onClose: () => void; onDeleted: (id: string) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}?reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("A bejelentés törölve.");
      onDeleted(report.id);
    } catch {
      toast.error("Nem sikerült törölni.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Bejelentés törlése" onClose={onClose}>
      <p className="text-sm text-gray-700">
        Biztosan törlöd: <strong>{report.name || "Névtelen"}</strong> ({TYPE_LABEL[report.type]}, {report.city})?
      </p>
      <p className="mt-2 text-sm text-red-700">
        A törlés végleges: a bejelentés, a {report.imageCount} kép hivatkozása és a párosítások is törlődnek.
        Ha csak el akarod rejteni, állítsd az állapotát „Lezárt”-ra.
      </p>
      <label className={cn(labelCls, "mt-4")}>Indok (az adminnaplóba kerül, nem kötelező)</label>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={cls} placeholder="pl. spam, duplikált, a bejelentő kérte" />
      <div className="mt-5 flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Mégse</Button>
        <Button type="button" variant="danger" className="flex-1" onClick={remove} loading={busy}>
          <Trash2 className="h-4 w-4" /> Végleges törlés
        </Button>
      </div>
    </Modal>
  );
}
