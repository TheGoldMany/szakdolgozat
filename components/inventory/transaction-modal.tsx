"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface Props {
  item: { id: string; name: string; unit: string; quantity: number };
  onClose: () => void;
}

type TxType = "IN" | "OUT" | "ADJUST";

const TYPE_LABELS: Record<TxType, { label: string; color: string }> = {
  IN:     { label: "Bevételezés",          color: "bg-green-50 border-green-400 text-green-700" },
  OUT:    { label: "Felhasználás",          color: "bg-red-50 border-red-400 text-red-700"   },
  ADJUST: { label: "Leltári korrekció",     color: "bg-blue-50 border-blue-400 text-blue-700" },
};

export function TransactionModal({ item, onClose }: Props) {
  const router = useRouter();
  const [type,    setType]    = useState<TxType>("IN");
  const [value,   setValue]   = useState("");
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const isAdjust = type === "ADJUST";

  // Preview of new quantity
  const numVal = Number(value) || 0;
  const preview = isAdjust
    ? numVal
    : type === "IN"
      ? item.quantity + numVal
      : Math.max(0, item.quantity - numVal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = isAdjust
      ? { type, targetQuantity: numVal, note: note || undefined }
      : { type, quantity: numVal, note: note || undefined };

    const res = await fetch(`/api/inventory/${item.id}/transactions`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sikertelen");
      return;
    }

    router.refresh();
    onClose();
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Mozgás rögzítése — {item.name}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {/* Típus választó */}
          <div className="grid grid-cols-3 gap-2">
            {(["IN", "OUT", "ADJUST"] as TxType[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => { setType(t); setValue(""); setError(null); }}
                className={`rounded-xl border-2 py-2 text-xs font-semibold transition-colors ${
                  type === t
                    ? TYPE_LABELS[t].color
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {TYPE_LABELS[t].label}
              </button>
            ))}
          </div>

          {/* Mennyiség */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {isAdjust ? `Tényleges mennyiség (${item.unit})` : `Mennyiség (${item.unit})`}
            </label>
            <input
              required
              type="number" min={0} step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={inputCls}
              placeholder={isAdjust ? `Jelenlegi: ${item.quantity} ${item.unit}` : "0"}
            />
          </div>

          {/* Előnézet */}
          {value !== "" && (
            <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm">
              <span className="text-gray-500">Várható készlet: </span>
              <span className="font-bold text-gray-900">{preview.toLocaleString("hu-HU")} {item.unit}</span>
            </div>
          )}

          {/* Megjegyzés */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Megjegyzés</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder="nem kötelező"
            />
          </div>

          {/* Gombok */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Mégse
            </button>
            <button type="submit" disabled={saving || !value}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
              {saving ? "Mentés…" : "Rögzítés"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
