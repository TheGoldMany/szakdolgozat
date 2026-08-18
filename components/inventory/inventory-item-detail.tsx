"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, ArrowDownCircle, ArrowUpCircle, RotateCcw, AlertTriangle, Clock } from "lucide-react";
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

const TX_ICONS = {
  IN:     { icon: ArrowDownCircle, color: "text-green-500", bg: "bg-green-50", label: "Bevételezés" },
  OUT:    { icon: ArrowUpCircle,   color: "text-red-500",   bg: "bg-red-50",   label: "Felhasználás" },
  ADJUST: { icon: RotateCcw,       color: "text-blue-500",  bg: "bg-blue-50",  label: "Korrekció" },
};

interface Transaction {
  id:        string;
  type:      string;
  quantity:  number;
  note:      string | null;
  createdBy: { id: string; name: string | null } | null;
  createdAt: string;
}

interface Item {
  id:          string;
  shelterId:   string;
  shelterName: string;
  name:        string;
  category:    string;
  unit:        string;
  quantity:    number;
  minQuantity: number | null;
  expiresAt:   string | null;
  note:        string | null;
  createdAt:   string;
  updatedAt:   string;
  transactions: Transaction[];
}

export function InventoryItemDetail({ item: initialItem }: { item: Item }) {
  const router = useRouter();
  const [item, setItem] = useState(initialItem);
  const [showTx,   setShowTx]   = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const now   = new Date();
  const in7d  = new Date(now.getTime() + 7 * 86_400_000);

  const isLow     = item.minQuantity !== null && item.quantity < item.minQuantity;
  const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
  const isExpired = expiresAt ? expiresAt < now  : false;
  const isExpSoon = expiresAt ? expiresAt <= in7d && !isExpired : false;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {isLow && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Alacsony készlet! Jelenlegi: <strong>{item.quantity} {item.unit}</strong>, minimum: {item.minQuantity} {item.unit}
        </div>
      )}
      {(isExpired || isExpSoon) && (
        <div className={cn(
          "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
          isExpired ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"
        )}>
          <Clock className="h-4 w-4 shrink-0" />
          {isExpired
            ? `Ez a tétel lejárt: ${expiresAt!.toLocaleDateString("hu-HU")}`
            : `Hamarosan lejár: ${expiresAt!.toLocaleDateString("hu-HU")}`}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info kártya */}
        <div className="lg:col-span-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Adatok</h2>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Szerkesztés
            </button>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Kategória</dt>
              <dd className="font-medium text-gray-700">{CATEGORY_LABELS[item.category] ?? item.category}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Mértékegység</dt>
              <dd className="font-medium text-gray-700">{item.unit}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-400">Készlet</dt>
              <dd className={cn("text-xl font-bold", isLow ? "text-red-600" : "text-gray-900")}>
                {item.quantity.toLocaleString("hu-HU")} {item.unit}
              </dd>
            </div>
            {item.minQuantity !== null && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Minimum</dt>
                <dd className="font-medium text-gray-700">{item.minQuantity} {item.unit}</dd>
              </div>
            )}
            {expiresAt && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Lejárat</dt>
                <dd className={cn("font-medium", isExpired ? "text-red-600" : isExpSoon ? "text-amber-600" : "text-gray-700")}>
                  {expiresAt.toLocaleDateString("hu-HU")}
                </dd>
              </div>
            )}
            {item.note && (
              <div>
                <dt className="text-gray-400 mb-1">Megjegyzés</dt>
                <dd className="text-gray-600 text-xs leading-relaxed">{item.note}</dd>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <dt className="text-gray-400">Menhely</dt>
              <dd className="text-gray-500">{item.shelterName}</dd>
            </div>
          </dl>

          <button
            onClick={() => setShowTx(true)}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Mozgás rögzítése
          </button>
        </div>

        {/* Mozgástörténet */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Mozgástörténet
            <span className="ml-2 text-xs font-normal text-gray-400">({item.transactions.length} bejegyzés)</span>
          </h2>

          {item.transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Még nincs rögzített mozgás.</p>
          ) : (
            <div className="space-y-2">
              {item.transactions.map((tx) => {
                const cfg = TX_ICONS[tx.type as keyof typeof TX_ICONS] ?? TX_ICONS.ADJUST;
                const Icon = cfg.icon;
                const isPositive = tx.quantity > 0;
                return (
                  <div key={tx.id} className="flex items-start gap-3 rounded-xl border border-gray-50 bg-gray-50/60 px-4 py-3">
                    <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                        <span className={cn(
                          "text-sm font-bold",
                          isPositive ? "text-green-600" : "text-red-600"
                        )}>
                          {isPositive ? "+" : ""}{tx.quantity.toLocaleString("hu-HU")} {item.unit}
                        </span>
                      </div>
                      {tx.note && <p className="mt-0.5 text-xs text-gray-500">{tx.note}</p>}
                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {tx.createdBy?.name ?? "Rendszer"}
                        {" · "}
                        {new Date(tx.createdAt).toLocaleString("hu-HU", {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction modal */}
      {showTx && (
        <TransactionModal
          item={{ id: item.id, name: item.name, unit: item.unit, quantity: item.quantity }}
          onClose={() => { setShowTx(false); router.refresh(); }}
        />
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Tétel szerkesztése</h2>
              <button onClick={() => setShowEdit(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
            </div>
            <div className="p-5">
              <InventoryItemForm shelterId={item.shelterId} item={item} onClose={() => { setShowEdit(false); router.refresh(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
