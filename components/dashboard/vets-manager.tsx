"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Trash2, MapPin, Phone, Globe, Clock, AlertTriangle, Loader2, Crosshair,
  Upload, FileSpreadsheet, Download, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { parseCsv } from "@/lib/csv";

export interface VetClinic {
  id:           string;
  name:         string;
  address:      string;
  city:         string;
  zipCode:      string | null;
  phone:        string | null;
  email:        string | null;
  website:      string | null;
  openingHours: string | null;
  isEmergency:  boolean;
  isActive:     boolean;
  lat:          number | null;
  lng:          number | null;
}

const cls = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

/** Az importban felismert oszlopnevek – a fejléc magyarul és angolul is jó lehet. */
const KNOWN_COLUMNS: Record<string, string[]> = {
  "Név *":         ["name", "nev", "név"],
  "Cím *":         ["address", "cim", "cím"],
  "Város *":       ["city", "varos", "város"],
  "Irányítószám":  ["zipcode", "zip", "iranyitoszam", "irányítószám"],
  "Telefon":       ["phone", "telefon"],
  "E-mail":        ["email", "e-mail"],
  "Weboldal":      ["website", "weboldal"],
  "Nyitvatartás":  ["openinghours", "nyitvatartas", "nyitvatartás"],
  "Megjegyzés":    ["note", "megjegyzes", "megjegyzés"],
  "Ügyelet":       ["isemergency", "ugyelet", "ügyelet"],
  "Szélesség":     ["lat"],
  "Hosszúság":     ["lng", "lon", "long"],
};

const SAMPLE_CSV = [
  "nev;cim;varos;iranyitoszam;telefon;email;weboldal;nyitvatartas;ugyelet;lat;lng",
  'Kisállat Rendelő Kft.;Kossuth Lajos utca 12.;Budapest;1053;+36 1 234 5678;info@kisallatrendelo.hu;https://kisallatrendelo.hu;"H-P 8:00-18:00, Szo 9:00-12:00";nem;47.4925;19.0514',
  "Ügyeletes Állatkórház;Fő tér 3.;Debrecen;4024;+36 52 111 222;;;0-24;igen;;",
].join("\r\n");

interface ImportResult {
  created:    number;
  skipped:    number;
  duplicates: number;
  errors:     { row: number; reason: string }[];
}

export function VetsManager({ initial }: { initial: VetClinic[] }) {
  const router = useRouter();
  const [vets, setVets]         = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [busy, setBusy]         = useState<string | null>(null);

  // CSV import állapot
  const [showImport, setShowImport]   = useState(false);
  const [fileName, setFileName]       = useState<string | null>(null);
  const [preview, setPreview]         = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [importing, setImporting]     = useState(false);
  const [result, setResult]           = useState<ImportResult | null>(null);

  const [form, setForm] = useState({
    name: "", address: "", city: "", zipCode: "",
    phone: "", email: "", website: "", openingHours: "",
    isEmergency: false,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch("/api/admin/vets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "A mentés nem sikerült."); return; }

      setVets((prev) => [...prev, data]);
      setShowForm(false);
      setForm({ name: "", address: "", city: "", zipCode: "", phone: "", email: "", website: "", openingHours: "", isEmergency: false });
      toast.success(
        data.lat != null
          ? "Rendelő hozzáadva és elhelyezve a térképen."
          : "Rendelő hozzáadva, de a cím nem volt beazonosítható — add meg a koordinátát.",
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function regeocode(id: string) {
    setBusy(id);
    try {
      const res  = await fetch(`/api/admin/vets/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ regeocode: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Nem sikerült."); return; }
      setVets((prev) => prev.map((v) => (v.id === id ? data : v)));
      toast[data.lat != null ? "success" : "error"](
        data.lat != null ? "Koordináta frissítve." : "A cím nem volt beazonosítható.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Biztosan törlöd? ${name}`)) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/vets/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVets((prev) => prev.filter((v) => v.id !== id));
        toast.success("Rendelő törölve.");
      } else {
        toast.error("A törlés nem sikerült.");
      }
    } finally {
      setBusy(null);
    }
  }

  function resetImport() {
    setFileName(null);
    setPreview(null);
    setResult(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setResult(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        setFileName(file.name);
        setPreview(null);
        toast.error("A fájlban nincs feldolgozható sor.");
        return;
      }
      setFileName(file.name);
      setPreview(parsed);
    } catch {
      toast.error("A fájlt nem sikerült beolvasni.");
    }
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const res  = await fetch("/api/admin/vets/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: preview.rows }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Az importálás nem sikerült."); return; }

      setResult(data as ImportResult);
      setPreview(null);

      // Lista frissítése a szerverről
      const listRes = await fetch("/api/admin/vets");
      if (listRes.ok) setVets(await listRes.json());

      if (data.created > 0) toast.success(`${data.created} rendelő importálva.`);
      else toast.error("Egy rendelő sem került be — nézd meg a részleteket.");
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  function downloadSample() {
    // BOM-mal, hogy az Excel helyesen olvassa az ékezeteket
    const blob = new Blob(["﻿" + SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = "rendelok-minta.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Melyik ismert mezőket találtuk meg / mely oszlopokat nem ismertük fel
  const recognised = preview
    ? Object.entries(KNOWN_COLUMNS)
        .filter(([, aliases]) => aliases.some((a) => preview.headers.includes(a)))
        .map(([label]) => label)
    : [];
  const unknown = preview
    ? preview.headers.filter((h) => !Object.values(KNOWN_COLUMNS).some((aliases) => aliases.includes(h)))
    : [];
  const previewColumns = preview ? preview.headers.slice(0, 6) : [];

  const missingCoords = vets.filter((v) => v.lat == null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Mégse" : "Új rendelő"}
          </button>
          <button
            onClick={() => { setShowImport((v) => !v); resetImport(); }}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {showImport ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {showImport ? "Import bezárása" : "CSV importálás"}
          </button>
        </div>
        {missingCoords > 0 && (
          <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {missingCoords} rendelő nem jelenik meg a térképen (nincs koordináta)
          </span>
        )}
      </div>

      {showImport && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-bold text-gray-900">Rendelők importálása CSV fájlból</h3>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Várt oszlopok: <span className="font-medium text-gray-700">nev, cim, varos</span> (kötelező), valamint
            opcionálisan iranyitoszam, telefon, email, weboldal, nyitvatartas, megjegyzes, ugyelet (igen/nem), lat, lng.
            Az angol fejlécnevek (name, address, city…) is működnek. Az elválasztó lehet pontosvessző vagy vessző.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Egyszerre legfeljebb 500 sor tölthető fel. Import közben nem számolunk koordinátát — ha nincs lat/lng
            az oszlopokban, a listában az „Elhelyezés” gombbal teheted rá a rendelőt a térképre.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
              <Upload className="h-4 w-4" />
              Fájl kiválasztása
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
            <button
              type="button"
              onClick={downloadSample}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Minta CSV letöltése
            </button>
            {fileName && <span className="text-xs text-gray-500">{fileName}</span>}
          </div>

          {preview && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                {preview.rows.length} sor található a fájlban
              </p>

              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p>
                  <span className="font-medium">Felismert oszlopok:</span>{" "}
                  {recognised.length > 0 ? recognised.join(", ") : "nincs felismert oszlop"}
                </p>
                {unknown.length > 0 && (
                  <p className="text-amber-700">
                    <span className="font-medium">Figyelmen kívül hagyva:</span> {unknown.join(", ")}
                  </p>
                )}
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      {previewColumns.map((h) => (
                        <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 text-gray-700">
                        {previewColumns.map((h) => (
                          <td key={h} className="max-w-[180px] truncate px-2 py-1.5">{r[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.headers.length > previewColumns.length && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Az előnézet az első {previewColumns.length} oszlopot és 5 sort mutatja.
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={runImport}
                  disabled={importing}
                  className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
                >
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {importing ? "Importálás…" : "Importálás"}
                </button>
                <button
                  type="button"
                  onClick={resetImport}
                  disabled={importing}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  Mégse
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-semibold text-gray-900">Az importálás befejeződött</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-green-50 px-2.5 py-1 font-medium text-green-700">
                  Létrehozva: {result.created}
                </span>
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                  Duplikátum: {result.duplicates}
                </span>
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                  Kihagyva: {result.skipped}
                </span>
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-600">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>
                      <span className="font-medium text-gray-800">{err.row}. sor:</span> {err.reason}
                    </li>
                  ))}
                  {result.errors.length > 20 && (
                    <li className="text-gray-400">és további {result.errors.length - 20} hibás sor…</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={create} className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Rendelő neve *</label>
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                placeholder="pl. Kisállat Rendelő Kft." className={cls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Cím (utca, házszám) *</label>
              <input required value={form.address} onChange={(e) => set("address", e.target.value)}
                placeholder="pl. Kossuth Lajos utca 12." className={cls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Város *</label>
              <input required value={form.city} onChange={(e) => set("city", e.target.value)} className={cls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Irányítószám</label>
              <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} className={cls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Telefon</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={cls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={cls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Weboldal</label>
              <input type="url" value={form.website} onChange={(e) => set("website", e.target.value)}
                placeholder="https://" className={cls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Nyitvatartás</label>
              <input value={form.openingHours} onChange={(e) => set("openingHours", e.target.value)}
                placeholder="pl. H–P 8:00–18:00, Szo 9:00–12:00" className={cls} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={form.isEmergency}
                onChange={(e) => set("isEmergency", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500" />
              <span className="text-sm text-gray-700">24 órás ügyelet / sürgősségi ellátás</span>
            </label>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            A cím alapján automatikusan elhelyezzük a térképen. Ha nem sikerül, a listában újra megpróbálhatod.
          </p>

          <button type="submit" disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Mentés…" : "Rendelő hozzáadása"}
          </button>
        </form>
      )}

      {vets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          Még nincs felvett állatorvosi rendelő.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vets.map((v) => (
            <div key={v.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-bold text-gray-900">{v.name}</h3>
                    {v.isEmergency && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">Ügyelet</span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {v.zipCode ? `${v.zipCode} ` : ""}{v.city}, {v.address}
                  </p>
                </div>
                <button onClick={() => remove(v.id, v.name)} disabled={busy === v.id}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 space-y-1 text-xs text-gray-500">
                {v.openingHours && <p className="flex items-center gap-1.5"><Clock className="h-3 w-3 shrink-0" />{v.openingHours}</p>}
                {v.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{v.phone}</p>}
                {v.website && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Globe className="h-3 w-3 shrink-0" />
                    <a href={v.website} target="_blank" rel="noopener noreferrer" className="truncate text-brand-600 hover:underline">
                      {v.website}
                    </a>
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2.5">
                {v.lat != null ? (
                  <span className="text-[11px] font-medium text-green-600">Térképen megjelenik</span>
                ) : (
                  <span className="text-[11px] font-medium text-amber-600">Nincs koordináta</span>
                )}
                <button onClick={() => regeocode(v.id)} disabled={busy === v.id}
                  title="Koordináta újraszámolása a cím alapján"
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50">
                  {busy === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
                  Elhelyezés
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
