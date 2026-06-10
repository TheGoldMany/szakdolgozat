"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X, PauseCircle, Package, AlertTriangle, PawPrint } from "lucide-react";
import {
  ANIMAL_TYPE_LABELS, FOSTER_STATUS_LABELS, FOSTER_STATUS_COLORS,
} from "@/lib/foster";
import type { AnimalType, FosterStatus } from "@prisma/client";

interface SupplyLog {
  id:        string;
  quantity:  number;
  note:      string | null;
  createdAt: string;
  item:      { name: string; unit: string };
}
interface FosterRow {
  id:             string;
  status:         FosterStatus;
  preferredTypes: AnimalType[];
  maxWeightKg:    number | null;
  canQuarantine:  boolean;
  motivation:     string | null;
  adminNote:      string | null;
  createdAt:      string;
  user:           { name: string | null; email: string };
  fosteredAnimals:{ id: string; name: string; slug: string }[];
  supplyLogs:     SupplyLog[];
}
interface InventoryLite { id: string; name: string; unit: string; quantity: number }

export function FosterAdmin({ initialFosters, inventory }: {
  initialFosters: FosterRow[];
  inventory:      InventoryLite[];
}) {
  const router = useRouter();
  const t = useTranslations("foster");
  const [fosters, setFosters] = useState<FosterRow[]>(initialFosters);
  const [error, setError]     = useState<string | null>(null);
  const [supplyOpen, setSupplyOpen] = useState<string | null>(null);

  async function setStatus(id: string, status: FosterStatus) {
    setError(null);
    const res = await fetch(`/api/foster/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? t("error")); return; }
    setFosters(prev => prev.map(f => f.id === id ? { ...f, status } : f));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {fosters.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          {t("adminNoFosters")}
        </p>
      ) : fosters.map(f => (
        <div key={f.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-gray-900">{f.user.name ?? f.user.email}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${FOSTER_STATUS_COLORS[f.status]}`}>
                  {FOSTER_STATUS_LABELS[f.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400">{f.user.email}</p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>
                  <span className="font-medium">{t("adminPreferred")}</span>{" "}
                  {f.preferredTypes.length > 0
                    ? f.preferredTypes.map(type => ANIMAL_TYPE_LABELS[type]).join(", ")
                    : t("adminAnything")}
                </span>
                {f.maxWeightKg != null && <span><span className="font-medium">{t("adminMaxWeight")}</span> {f.maxWeightKg} kg</span>}
                <span><span className="font-medium">{t("adminQuarantine")}</span> {f.canQuarantine ? t("adminQuarantineYes") : t("adminQuarantineNo")}</span>
              </div>
              {f.motivation && <p className="mt-1.5 text-xs italic text-gray-500">„{f.motivation}"</p>}
            </div>

            {/* Műveletek */}
            <div className="flex flex-wrap gap-2">
              {f.status !== "ACTIVE" && (
                <button onClick={() => setStatus(f.id, "ACTIVE")}
                  className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
                  <Check className="h-3.5 w-3.5" /> {t("adminApprove")}
                </button>
              )}
              {f.status !== "REJECTED" && (
                <button onClick={() => setStatus(f.id, "REJECTED")}
                  className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                  <X className="h-3.5 w-3.5" /> {t("adminReject")}
                </button>
              )}
              {f.status === "ACTIVE" && (
                <button onClick={() => setStatus(f.id, "INACTIVE")}
                  className="flex items-center gap-1 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                  <PauseCircle className="h-3.5 w-3.5" /> {t("adminDeactivate")}
                </button>
              )}
            </div>
          </div>

          {/* Kihelyezett állatok */}
          {f.fosteredAnimals.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
              <PawPrint className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">{t("adminAnimalsInCare")}</span>
              {f.fosteredAnimals.map(a => (
                <Link key={a.id} href={`/animals/${a.slug}`}
                  className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 hover:bg-purple-100">
                  {a.name}
                </Link>
              ))}
            </div>
          )}

          {/* Készletkiadás (csak aktív befogadónál) */}
          {f.status === "ACTIVE" && (
            <div className="mt-3 border-t border-gray-50 pt-3">
              <button onClick={() => setSupplyOpen(supplyOpen === f.id ? null : f.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline">
                <Package className="h-3.5 w-3.5" />
                {supplyOpen === f.id ? t("adminSupplyClose") : t("adminSupplyIssue")}
              </button>

              {supplyOpen === f.id && (
                <SupplyForm fosterId={f.id} inventory={inventory}
                  onLogged={(log) => {
                    setFosters(prev => prev.map(x => x.id === f.id
                      ? { ...x, supplyLogs: [log, ...x.supplyLogs] }
                      : x));
                    router.refresh();
                  }}
                  onError={setError} />
              )}

              {f.supplyLogs.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-500">
                  {f.supplyLogs.slice(0, 5).map(log => (
                    <li key={log.id} className="flex justify-between">
                      <span>{log.item.name}{log.note ? ` – ${log.note}` : ""}</span>
                      <span className="font-medium text-gray-700">
                        −{log.quantity} {log.item.unit} · {new Date(log.createdAt).toLocaleDateString("hu-HU")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SupplyForm({ fosterId, inventory, onLogged, onError }: {
  fosterId:  string;
  inventory: InventoryLite[];
  onLogged:  (log: SupplyLog) => void;
  onError:   (msg: string | null) => void;
}) {
  const t = useTranslations("foster");
  const [itemId, setItemId]     = useState(inventory[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [note, setNote]         = useState("");
  const [loading, setLoading]   = useState(false);

  const selected = inventory.find(i => i.id === itemId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError(null); setLoading(true);
    const res = await fetch(`/api/foster/${fosterId}/supply`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ itemId, quantity: Number(quantity), note: note || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { onError(data.error ?? t("error")); return; }
    onLogged(data as SupplyLog);
    setQuantity(""); setNote("");
  }

  if (inventory.length === 0) {
    return <p className="mt-2 text-xs text-gray-400">{t("adminNoInventory")}</p>;
  }

  return (
    <form onSubmit={submit} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-brand-100 bg-brand-50 p-3 sm:grid-cols-4">
      <select value={itemId} onChange={e => setItemId(e.target.value)}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none sm:col-span-2">
        {inventory.map(i => (
          <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>
        ))}
      </select>
      <input required type="number" min={0} step={0.1} value={quantity}
        onChange={e => setQuantity(e.target.value)}
        placeholder={`${t("adminQuantityPlaceholder")}${selected ? ` (${selected.unit})` : ""}`}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none" />
      <button type="submit" disabled={loading}
        className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
        {loading ? "…" : t("adminIssueBtn")}
      </button>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder={t("adminNoteOptional")}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none sm:col-span-4" />
    </form>
  );
}
