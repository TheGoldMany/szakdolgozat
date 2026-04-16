"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, CheckCheck, CreditCard, Building2 } from "lucide-react";

interface BankInfo {
  beneficiary:   string | null;
  accountNumber: string | null;
  reference:     string;
}

interface DonateFormProps {
  campaignId: string;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" onClick={handleCopy}
      className="shrink-0 text-gray-400 hover:text-brand-500 transition-colors" title="Másolás">
      {copied
        ? <CheckCheck className="h-3.5 w-3.5 text-brand-500" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function DonateForm({ campaignId }: DonateFormProps) {
  const [amount, setAmount]           = useState<number>(2000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom]       = useState(false);
  const [message, setMessage]         = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [bankInfo, setBankInfo]       = useState<BankInfo | null>(null);
  const [paidAmount, setPaidAmount]   = useState<number>(0);

  function handlePreset(val: number) {
    setAmount(val);
    setIsCustom(false);
    setCustomAmount("");
  }

  function handleCustomChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setCustomAmount(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed) && parsed > 0) setAmount(parsed);
    setIsCustom(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || amount < 100) {
      setError("Az összeg minimum 100 Ft lehet.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/donate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ campaignId, amount, message: message || undefined, isAnonymous }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Hiba történt a fizetés indításakor.");
      }
      const data = await res.json();
      setPaidAmount(data.amount);
      setBankInfo(data.bankInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba történt.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state: show bank transfer details ──
  if (bankInfo !== null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-brand-600">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">Adomány rögzítve!</p>
        </div>
        <p className="text-sm text-gray-600">
          Köszönjük! Kérjük, utald át az összeget az alábbi számlára.
        </p>

        <div className="rounded-xl bg-brand-50 px-4 py-3 text-center">
          <p className="text-xs text-brand-600 font-medium">Átutalni</p>
          <p className="text-2xl font-bold text-brand-700">{formatHUF(paidAmount)}</p>
        </div>

        {bankInfo.beneficiary || bankInfo.accountNumber ? (
          <dl className="space-y-3">
            {bankInfo.beneficiary && (
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-gray-400">Kedvezményezett</dt>
                  <dd className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 break-all">
                      {bankInfo.beneficiary}
                    </span>
                    <CopyButton text={bankInfo.beneficiary} />
                  </dd>
                </div>
              </div>
            )}
            {bankInfo.accountNumber && (
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs text-gray-400">Bankszámlaszám</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-800 break-all">
                      {bankInfo.accountNumber}
                    </span>
                    <CopyButton text={bankInfo.accountNumber} />
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs text-gray-400">#</span>
              <div className="min-w-0 flex-1">
                <dt className="text-xs text-gray-400">Közlemény</dt>
                <dd className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 break-all">
                    {bankInfo.reference}
                  </span>
                  <CopyButton text={bankInfo.reference} />
                </dd>
              </div>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">
            A szervező még nem adott meg bankszámla adatokat. Keresd őket közvetlenül!
          </p>
        )}

        <p className="text-xs text-gray-400">
          Az átutalás beérkezése után a szervező manuálisan igazolja az adományod.
        </p>
      </div>
    );
  }

  // ── Default: donation form ──
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Preset amount buttons */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Összeg kiválasztása</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESET_AMOUNTS.map((val) => (
            <button key={val} type="button" onClick={() => handlePreset(val)}
              className={[
                "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                !isCustom && amount === val
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-brand-400 hover:text-brand-600",
              ].join(" ")}
            >
              {formatHUF(val)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Egyedi összeg (Ft)
        </label>
        <input type="text" inputMode="numeric" placeholder="pl. 3000"
          value={customAmount} onChange={handleCustomChange} onFocus={() => setIsCustom(true)}
          className={[
            "w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors",
            isCustom
              ? "border-brand-500 ring-1 ring-brand-500"
              : "border-gray-200 focus:border-brand-400",
          ].join(" ")}
        />
      </div>

      {/* Message */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Üzenet (opcionális)
        </label>
        <textarea rows={3} placeholder="Írj egy üzenetet az adományodhoz…"
          value={message} onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400 resize-none"
        />
      </div>

      {/* Anonymous checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand-500 accent-brand-500"
        />
        <span className="text-sm text-gray-600">Névtelen adományozás</span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Adományozás megerősítése
      </Button>
    </form>
  );
}
