"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { MIN_DONATION_HUF } from "@/lib/donation-limits";

interface DonateFormProps {
  campaignId: string;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

function formatHUF(amount: number, locale: string) {
  return new Intl.NumberFormat(locale).format(amount) + " Ft";
}

export function DonateForm({ campaignId }: DonateFormProps) {
  const t       = useTranslations("donate");
  const tCommon = useTranslations("common");
  const locale  = useLocale();
  const [amount, setAmount]             = useState<number>(2000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustom, setIsCustom]         = useState(false);
  const [message, setMessage]           = useState("");
  const [isAnonymous, setIsAnonymous]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

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
    if (!amount || amount < MIN_DONATION_HUF) {
      setError(t("minAmountError", { min: MIN_DONATION_HUF }));
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
        throw new Error(data.error ?? t("checkoutError"));
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : tCommon("unknownError");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Preset amount buttons */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">{t("amountSelect")}</p>
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
              {formatHUF(val, locale)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("customAmount")}
        </label>
        <input type="text" inputMode="numeric" placeholder={t("customAmountPlaceholder")}
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
          {t("messageOptional")}
        </label>
        <textarea rows={3} placeholder={t("messagePlaceholder")}
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
        <span className="text-sm text-gray-600">{t("anonymousDonation")}</span>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {t("toPayment")}
      </Button>
    </form>
  );
}
