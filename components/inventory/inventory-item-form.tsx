"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  shelterId: string;
  item?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    minQuantity: number | null;
    expiresAt: string | null;
    note: string | null;
  };
  onClose?: () => void;
}

const CATEGORIES = [
  { value: "FOOD",      label: "Takarmány" },
  { value: "MEDICINE",  label: "Gyógyszer" },
  { value: "SUPPLIES",  label: "Kellékek" },
  { value: "CLEANING",  label: "Tisztítószer" },
  { value: "EQUIPMENT", label: "Eszköz / felszerelés" },
  { value: "OTHER",     label: "Egyéb" },
];

const UNITS = ["db", "kg", "g", "liter", "dl", "csomag", "doboz", "flakon"];

export function InventoryItemForm({ shelterId, item, onClose }: Props) {
  const router  = useRouter();
  const isEdit  = !!item;

  const [name,        setName]        = useState(item?.name        ?? "");
  const [category,    setCategory]    = useState(item?.category    ?? "OTHER");
  const [unit,        setUnit]        = useState(item?.unit        ?? "db");
  const [customUnit,  setCustomUnit]  = useState(!UNITS.includes(item?.unit ?? "db") ? (item?.unit ?? "") : "");
  const [quantity,    setQuantity]    = useState(item ? String(item.quantity) : "0");
  const [minQty,      setMinQty]      = useState(item?.minQuantity != null ? String(item.minQuantity) : "");
  const [expiresAt,   setExpiresAt]   = useState(item?.expiresAt ? item.expiresAt.slice(0, 10) : "");
  const [note,        setNote]        = useState(item?.note ?? "");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const effectiveUnit = unit === "__custom__" ? customUnit : unit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...(isEdit ? {} : { shelterId }),
      name,
      category,
      unit:        effectiveUnit,
      minQuantity: minQty ? Number(minQty) : null,
      expiresAt:   expiresAt ? new Date(expiresAt).toISOString() : null,
      note:        note || null,
      ...(!isEdit && { quantity: Number(quantity) }),
    };

    const res = await fetch(
      isEdit ? `/api/inventory/${item!.id}` : "/api/inventory",
      {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Mentés sikertelen");
      return;
    }

    router.refresh();
    onClose?.();
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* Megnevezés */}
      <div>
        <label className={labelCls}>Megnevezés *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="pl. Royal Canin Adult"
        />
      </div>

      {/* Kategória + mértékegység */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Kategória</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Mértékegység</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            <option value="__custom__">Egyéni…</option>
          </select>
          {unit === "__custom__" && (
            <input
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              className={`${inputCls} mt-1`}
              placeholder="pl. ampulla"
              required
            />
          )}
        </div>
      </div>

      {/* Nyitókészlet — csak létrehozáskor */}
      {!isEdit && (
        <div>
          <label className={labelCls}>Nyitókészlet ({effectiveUnit})</label>
          <input
            type="number" min={0} step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
          />
        </div>
      )}

      {/* Minimum készlet + lejárat */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Minimum ({effectiveUnit}) — riasztáshoz</label>
          <input
            type="number" min={0} step="any"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            className={inputCls}
            placeholder="nem kötelező"
          />
        </div>
        <div>
          <label className={labelCls}>Lejárati dátum</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Megjegyzés */}
      <div>
        <label className={labelCls}>Megjegyzés</label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${inputCls} resize-none`}
          placeholder="nem kötelező"
        />
      </div>

      {/* Gombok */}
      <div className="flex justify-end gap-2 pt-1">
        {onClose && (
          <button type="button" onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Mégse
          </button>
        )}
        <button type="submit" disabled={saving}
          className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
          {saving ? "Mentés…" : isEdit ? "Mentés" : "Hozzáadás"}
        </button>
      </div>
    </form>
  );
}
