"use client";

import { useState } from "react";
import { Heart, Users, X } from "lucide-react";

interface Props {
  animalId:       string;
  animalName:     string;
  slug:           string;
  loggedIn:       boolean;
  sponsorCount:   number;
  publicSponsors: { name: string }[];
}

const PRESETS = [1000, 2500, 5000, 10000];

export function VirtualAdoptionCard({
  animalId, animalName, slug, loggedIn, sponsorCount, publicSponsors,
}: Props) {
  const [open, setOpen]         = useState(false);
  const [amount, setAmount]     = useState(2500);
  const [custom, setCustom]     = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const finalAmount = custom ? Number(custom) : amount;
    const res = await fetch("/api/checkout/sponsor", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        animalId,
        amount:      finalAmount,
        isPublic,
        displayName: isPublic && name ? name : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setLoading(false);
      setError(data.error ?? "Hiba történt");
      return;
    }
    window.location.href = data.url;  // redirect to Stripe Checkout
  }

  return (
    <div className="rounded-2xl border border-pink-100 bg-pink-50 p-5">
      <div className="mb-1 flex items-center gap-2">
        <Heart className="h-4 w-4 text-pink-500" />
        <h2 className="text-sm font-semibold text-pink-800">Virtuális örökbefogadás</h2>
      </div>
      <p className="text-xs text-pink-700">
        Támogasd {animalName} ellátását havi rendszeres adománnyal, anélkül hogy fizikailag örökbe fogadnád.
      </p>

      {/* Aktív gazdik */}
      {sponsorCount > 0 && (
        <div className="mt-3 flex items-start gap-2 text-xs text-pink-700">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>{sponsorCount}</strong> virtuális gazdi támogatja
            {publicSponsors.length > 0 && (
              <>: {publicSponsors.slice(0, 5).map(s => s.name).join(", ")}
                {publicSponsors.length > 5 && ` és még ${publicSponsors.length - 5}`}</>
            )}
          </span>
        </div>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-600 transition-colors">
          <Heart className="h-4 w-4" /> Virtuális örökbefogadás
        </button>
      ) : !loggedIn ? (
        <div className="mt-4 rounded-xl border border-pink-200 bg-white p-4 text-center">
          <p className="text-sm text-gray-600">A virtuális örökbefogadáshoz be kell jelentkezned.</p>
          <a href={`/auth/login?callbackUrl=/animals/${slug}`}
            className="mt-3 inline-block rounded-xl bg-pink-500 px-5 py-2 text-sm font-semibold text-white hover:bg-pink-600 transition-colors">
            Bejelentkezés
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-pink-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Havi támogatás összege</p>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map(p => (
              <button key={p} type="button"
                onClick={() => { setAmount(p); setCustom(""); }}
                className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-all ${
                  !custom && amount === p
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 bg-white text-gray-500 hover:border-pink-200"
                }`}>
                {p.toLocaleString("hu-HU")}
              </button>
            ))}
          </div>

          <input type="number" min={500} step={500} value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Egyéni összeg (Ft)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)}
              className="accent-pink-500" />
            Jelenjen meg a nevem „Virtuális gazdi”-ként
          </label>

          {isPublic && (
            <input value={name} onChange={e => setName(e.target.value)} maxLength={60}
              placeholder="Megjelenítendő név (opcionális, alapból a profilneved)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100" />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-pink-500 py-2.5 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-60 transition-colors">
            {loading ? "Átirányítás…" : `Támogatás ${(custom ? Number(custom) : amount).toLocaleString("hu-HU")} Ft/hó`}
          </button>
        </form>
      )}
    </div>
  );
}
