"use client";

import { useState } from "react";
import { Database, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type SeedResult = {
  success: boolean;
  users?: number; shelters?: number; animals?: number; applications?: number;
  tiers?: number; campaigns?: number; subscriptions?: number; donations?: number;
  reports?: number; conversations?: number; messages?: number;
  healthRecords?: number; reviews?: number; volunteers?: number;
  attendances?: number; tasks?: number; appointments?: number;
  followUps?: number; inventoryItems?: number; transactions?: number;
  notifications?: number;
  error?: string; detail?: string;
};

const RESULT_LABELS: [keyof SeedResult, string][] = [
  ["users",          "Felhasználók"],
  ["shelters",       "Menhelyek"],
  ["animals",        "Állatok"],
  ["applications",   "Kérelmek"],
  ["tiers",          "Adományozási szintek"],
  ["campaigns",      "Kampányok"],
  ["subscriptions",  "Előfizetések"],
  ["donations",      "Adományok"],
  ["reports",        "Bejelentések"],
  ["conversations",  "Beszélgetések"],
  ["messages",       "Üzenetek"],
  ["healthRecords",  "Egészségügyi bejegyzések"],
  ["reviews",        "Értékelések"],
  ["volunteers",     "Önkéntesek"],
  ["attendances",    "Jelenléti naplók"],
  ["tasks",          "Feladatok"],
  ["appointments",   "Időpontok"],
  ["followUps",      "Utánkövetések"],
  ["inventoryItems", "Készlettételek"],
  ["transactions",   "Tranzakciók"],
  ["notifications",  "Értesítések"],
];

export function SeedPanel() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<SeedResult | null>(null);

  async function runSeed() {
    setLoading(true);
    setConfirming(false);
    setResult(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data: SeedResult = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: "Hálózati hiba", detail: String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
        <div>
          <h3 className="font-semibold text-red-800">Adatbázis seed</h3>
          <p className="mt-0.5 text-sm text-red-600">
            Törli az összes meglévő adatot, majd feltölti teljes demo adatkészlettel.
            A művelet 1–3 percet vesz igénybe és <strong>nem visszavonható</strong>.
          </p>
        </div>
      </div>

      {!confirming && !loading && !result && (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Seed indítása
        </button>
      )}

      {confirming && (
        <div className="rounded-lg border border-red-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">
              Biztosan törli az összes adatot és újra seedelni?
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runSeed}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Igen, seed!
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Mégse
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-red-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">
            Seedelés folyamatban… (ez 1–3 percet vehet igénybe)
          </span>
        </div>
      )}

      {result && (
        <div className={`rounded-lg border p-4 space-y-3 ${
          result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-white"
        }`}>
          {result.success ? (
            <>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">Seed sikeresen lefutott!</span>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-green-800 sm:grid-cols-3">
                {RESULT_LABELS.map(([key, label]) => {
                  const val = result[key] as number | undefined;
                  if (val === undefined || val === 0) return null;
                  return (
                    <span key={key}>
                      {label}: <strong>{val.toLocaleString("hu-HU")}</strong>
                    </span>
                  );
                })}
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-xs text-green-600 hover:underline"
              >
                Bezárás
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold">{result.error ?? "Ismeretlen hiba"}</span>
              </div>
              {result.detail && (
                <p className="rounded bg-red-100 p-2 font-mono text-xs text-red-700">{result.detail}</p>
              )}
              <button
                onClick={() => setResult(null)}
                className="text-xs text-red-600 hover:underline"
              >
                Bezárás
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
