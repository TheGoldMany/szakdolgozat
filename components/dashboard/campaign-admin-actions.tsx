"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export type CampaignAdminStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "REJECTED";

export interface CampaignAdminData {
  id:           string;
  title:        string;
  description:  string;
  targetAmount: number;
  imageUrl:     string | null;
  endsAt:       Date | string | null;
  status:       CampaignAdminStatus;
}

interface Props {
  campaign:     CampaignAdminData;
  hasDonations: boolean;
}

const STATUS_OPTIONS: { value: CampaignAdminStatus; label: string }[] = [
  { value: "PENDING",   label: "Jóváhagyásra vár" },
  { value: "ACTIVE",    label: "Aktív" },
  { value: "COMPLETED", label: "Lezárt" },
  { value: "REJECTED",  label: "Visszautasított" },
];

const cls =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

/** DateTime → "YYYY-MM-DD" a date inputhoz (üres, ha nincs dátum). */
function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CampaignAdminActions({ campaign, hasDonations }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title:        campaign.title,
    description:  campaign.description,
    targetAmount: String(campaign.targetAmount),
    imageUrl:     campaign.imageUrl ?? "",
    endsAt:       toDateInput(campaign.endsAt),
    status:       campaign.status,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function openEditor() {
    setForm({
      title:        campaign.title,
      description:  campaign.description,
      targetAmount: String(campaign.targetAmount),
      imageUrl:     campaign.imageUrl ?? "",
      endsAt:       toDateInput(campaign.endsAt),
      status:       campaign.status,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    const target = Number(form.targetAmount);
    if (!Number.isInteger(target) || target <= 0) {
      toast.error("A célösszeg csak pozitív egész szám lehet.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          title:        form.title.trim(),
          description:  form.description.trim(),
          targetAmount: target,
          imageUrl:     form.imageUrl.trim() || null,
          // A szerver ISO datetime stringet vár, vagy null-t, ha nincs megadva.
          endsAt:       form.endsAt ? new Date(`${form.endsAt}T00:00:00`).toISOString() : null,
          status:       form.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "A mentés nem sikerült.");
        return;
      }
      toast.success("A gyűjtés frissítve.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("A mentés nem sikerült.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Biztosan véglegesen törlöd ezt a gyűjtést? ${campaign.title}`)) return;

    setDeleting(true);
    try {
      const res  = await fetch(`/api/admin/campaigns/${campaign.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 409: a szerver megindokolja, miért nem törölhető — ezt mutatjuk meg.
        toast.error(data.error ?? "A törlés nem sikerült.");
        return;
      }
      toast.success("A gyűjtés törölve.");
      router.refresh();
    } catch {
      toast.error("A törlés nem sikerült.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openEditor}
          title="Gyűjtés szerkesztése"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Szerkesztés
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          title={
            hasDonations
              ? "A gyűjtéshez adomány tartozik — a törlés helyett zárd le."
              : "Gyűjtés törlése"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Törlés
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 sm:items-center">
          <form
            onSubmit={save}
            className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-5 text-sm shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-gray-900">Gyűjtés szerkesztése</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                aria-label="Bezárás"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Cím</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={cls}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Leírás</label>
                <textarea
                  required
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={cls}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Célösszeg (Ft)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    step={1}
                    value={form.targetAmount}
                    onChange={(e) => set("targetAmount", e.target.value)}
                    className={cls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Gyűjtés vége</label>
                  <input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => set("endsAt", e.target.value)}
                    className={cls}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Borítókép URL</label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  placeholder="https://"
                  className={cls}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Státusz</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as CampaignAdminStatus)}
                  className={cls}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Mentés…" : "Mentés"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
