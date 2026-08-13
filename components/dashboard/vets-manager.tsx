"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2, MapPin, Phone, Globe, Clock, AlertTriangle, Loader2, Crosshair } from "lucide-react";
import { toast } from "sonner";

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

export function VetsManager({ initial }: { initial: VetClinic[] }) {
  const router = useRouter();
  const [vets, setVets]         = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [busy, setBusy]         = useState<string | null>(null);

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

  const missingCoords = vets.filter((v) => v.lat == null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Mégse" : "Új rendelő"}
        </button>
        {missingCoords > 0 && (
          <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {missingCoords} rendelő nem jelenik meg a térképen (nincs koordináta)
          </span>
        )}
      </div>

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
            <div key={v.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
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
