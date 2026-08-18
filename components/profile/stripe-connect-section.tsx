"use client";

import { useState } from "react";
import { CreditCard, CheckCircle, AlertTriangle, Info, ExternalLink, Loader2 } from "lucide-react";

interface Props {
  stripeAccountId:          string | null;
  stripeOnboardingComplete: boolean;
}

export function StripeConnectSection({ stripeAccountId, stripeOnboardingComplete }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [opening, setOpening]       = useState(false);
  const [error, setError]           = useState("");

  async function connect() {
    setConnecting(true);
    setError("");
    try {
      const res  = await fetch("/api/stripe/connect/onboard", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hiba a csatlakozáskor.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba.");
      setConnecting(false);
    }
  }

  async function openDashboard() {
    setOpening(true);
    setError("");
    try {
      const res  = await fetch("/api/stripe/connect/dashboard", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hiba a megnyitáskor.");
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Stripe fiók</h2>
      </div>
      <p className="mb-4 text-xs text-gray-400">
        Kösd be a Stripe fiókod, ha saját gyűjtést szeretnél indítani — az adományok közvetlenül ide érkeznek.
      </p>

      {stripeOnboardingComplete ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">A Stripe fiókod aktív, fogadhatsz adományokat.</p>
          </div>
          <button
            type="button"
            onClick={openDashboard}
            disabled={opening}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Stripe vezérlőpult megnyitása
          </button>
        </div>
      ) : stripeAccountId ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">A Stripe regisztrációd még nincs befejezve.</p>
          </div>
          <button
            type="button"
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Info className="h-4 w-4" />}
            Regisztráció befejezése
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={connect}
          disabled={connecting}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Stripe fiók csatlakoztatása
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
