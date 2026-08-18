"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, AlertTriangle, Clock, ChevronRight, Pencil, Trash2, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionModal } from "./transaction-modal";
import { InventoryItemForm } from "./inventory-item-form";

const CATEGORY_LABELS: Record<string, string> = {
  FOOD:      "Takarmány",
  MEDICINE:  "Gyógyszer",
  SUPPLIES:  "Kellékek",
  CLEANING:  "Tisztítószer",
  EQUIPMENT: "Eszköz",
  OTHER:     "Egyéb",
};

const CATEGORY_COLORS: Record<string, string> = {
  FOOD:      "bg-green-50 text-green-700",
  MEDICINE:  "bg-blue-50 text-blue-700",
  SUPPLIES:  "bg-purple-50 text-purple-700",
  CLEANING:  "bg-cyan-50 text-cyan-700",
  EQUIPMENT: "bg-orange-50 text-orange-700",
  OTHER:     "bg-gray-100 text-gray-600",
};

interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number | null;
  expiresAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  items: Item[];
  shelterId: string | null;
  isSuperAdmin: boolean;
}

const ALL_CATS = ["ALL", "FOOD", "MEDICINE", "SUPPLIES", "CLEANING", "EQUIPMENT", "OTHER"];

export function InventoryList({ items, shelterId, isSuperAdmin }: Props) {
  const router                  = useRouter();
  const [q, setQ]               = useState("");
  const [cat, setCat]           = useState("ALL");
  const [txItem, setTxItem]     = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now   = new Date();
  const in7d  = new Date(now.getTime() + 7 * 86_400_000);

  const filtered = items.filter((i) => {
    const matchQ   = i.name.toLowerCase().includes(q.toLowerCase());
    const matchCat = cat === "ALL" || i.category === cat;
    return matchQ && matchCat;
  });

  function stockStatus(item: Item): "ok" | "low" | "empty" {
    if (item.minQuantity === null) return "ok";
    if (item.quantity <= 0) return "empty";
    if (item.quantity < item.minQuantity) return "low";
    return "ok";
  }

  function expiryStatus(item: Item): "expired" | "soon" | "ok" | null {
    if (!item.expiresAt) return null;
    const d = new Date(item.expiresAt);
    if (d < now)   return "expired";
    if (d <= in7d) return "soon";
    return "ok";
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd ezt a tételt? A mozgástörténet is elvész.")) return;
    setDeletingId(id);
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Keresés…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                cat === c
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {c === "ALL" ? "Összes" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Package className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nincs megjeleníthető tétel</p>
          {shelterId && (
            <Link
              href={`/dashboard/inventory/new?shelterId=${shelterId}`}
              className="mt-4 inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Első tétel hozzáadása
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Megnevezés</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">Kategória</th>
                <th className="px-4 py-3 text-right">Készlet</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Lejárat</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item) => {
                const ss = stockStatus(item);
                const es = expiryStatus(item);
                const isLow = ss === "low" || ss === "empty";
                const isExp = es === "expired" || es === "soon";

                return (
                  <tr key={item.id} className={cn("transition-colors hover:bg-gray-50", isLow && "bg-red-50/40")}>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/inventory/${item.id}`} className="flex items-center gap-2 group">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 group-hover:text-brand-600 transition-colors">
                            {item.name}
                          </p>
                          {item.note && (
                            <p className="mt-0.5 truncate text-xs text-gray-400 max-w-xs">{item.note}</p>
                          )}
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-brand-400" />
                      </Link>
                    </td>

                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-600")}>
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn("font-semibold", isLow ? "text-red-600" : "text-gray-800")}>
                          {item.quantity.toLocaleString("hu-HU")} {item.unit}
                        </span>
                        {isLow && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            {ss === "empty" ? "Elfogyott" : `Min: ${item.minQuantity}`}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="hidden px-4 py-3 md:table-cell">
                      {item.expiresAt ? (
                        <span className={cn(
                          "flex items-center gap-1 text-xs",
                          es === "expired" ? "text-red-600 font-semibold" :
                          es === "soon"    ? "text-amber-600 font-semibold" :
                          "text-gray-500"
                        )}>
                          {(es === "expired" || es === "soon") && <Clock className="h-3.5 w-3.5" />}
                          {new Date(item.expiresAt).toLocaleDateString("hu-HU")}
                          {es === "expired" && " – lejárt!"}
                          {es === "soon"    && " – hamarosan!"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick transaction */}
                        <button
                          onClick={() => setTxItem(item)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
                        >
                          Mozgás
                        </button>
                        <button
                          onClick={() => setEditItem(item)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction modal */}
      {txItem && (
        <TransactionModal item={txItem} onClose={() => setTxItem(null)} />
      )}

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Tétel szerkesztése</h2>
              <button onClick={() => setEditItem(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
                ✕
              </button>
            </div>
            <div className="p-5">
              <InventoryItemForm
                shelterId={editItem.id}
                item={editItem}
                onClose={() => setEditItem(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
