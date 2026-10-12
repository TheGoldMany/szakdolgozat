"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  MIN_DONATION_HUF, PLATFORM_FEE_PERCENT, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE_HUF,
  platformFee, stripeProcessingFee, donorTotal,
} from "@/lib/donation-limits";

interface DonateFormProps {
  campaignId: string;
  /**
   * Menhelyi gyűjtés-e. Egy gyűjtés tartozhat menhelyhez VAGY
   * magánszemélyhez (lásd `docs/07`), ezért nem írható ki fixen, hogy „a
   * menhelyhez kerül" — annál a gyűjtésnél, aminek nincs menhelye, az
   * egyszerűen nem lenne igaz.
   */
  isShelterCampaign?: boolean;
}

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

function formatHUF(amount: number, locale: string) {
  return new Intl.NumberFormat(locale).format(amount) + " Ft";
}

export function DonateForm({ campaignId, isShelterCampaign = false }: DonateFormProps) {
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

  // A bontás csak akkor jelenik meg, ha már van értelmes összeg: egy félig
  // beírt „1" mellett a 25 Ft fix díj nagyobb lenne, mint az adomány, és a
  // bontás a szándékkal ellentétesen riasztana el.
  const validAmount = amount >= MIN_DONATION_HUF;

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

      {/* A díjbontás ITT van, nem lábjegyzetben és nem csak a Stripe oldalán.
          Korábban a támogató 10 000 Ft-ot választott, és először a fizetőoldalon
          látott 10 665 Ft-ot — a díj meglepetés volt, a legrosszabb pillanatban.
          A számokat ugyanaz a képlet adja, amivel a szerver a Stripe-sorokat
          felépíti (`lib/donation-limits.ts`), tehát a kiírt végösszeg nem tud
          elcsúszni a terheltől. */}
      {validAmount && (
        <div className="rounded-xl border border-mint bg-cream p-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between gap-3 text-graphite">
              <dt>{t("feeLineDonation")}</dt>
              <dd className="shrink-0 whitespace-nowrap font-medium">{formatHUF(amount, locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-xs text-gray-500">
              <dt>{t("feeLinePlatform", { percent: PLATFORM_FEE_PERCENT })}</dt>
              <dd className="shrink-0 whitespace-nowrap">{formatHUF(platformFee(amount), locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-xs text-gray-500">
              <dt>{t("feeLineProcessing", { percent: STRIPE_PERCENT_FEE, fixed: STRIPE_FIXED_FEE_HUF })}</dt>
              <dd className="shrink-0 whitespace-nowrap">{formatHUF(stripeProcessingFee(amount), locale)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-mint pt-1.5 text-graphite">
              <dt className="font-semibold">{t("feeLineTotal")}</dt>
              <dd className="shrink-0 whitespace-nowrap font-bold">{formatHUF(donorTotal(amount), locale)}</dd>
            </div>
          </dl>

          {/* A fizetés pillanatában a hosszú indoklás védekezőnek hat, ezért itt
              csak a támogatót érdeklő lényeg áll — a teljes összeg a menhelyé —,
              a részletes magyarázat pedig egy kattintásra van. */}
          <p className="mt-3 text-xs leading-relaxed text-gray-600">
            {t(isShelterCampaign ? "feeExplainerShortShelter" : "feeExplainerShort",
               { amount: formatHUF(amount, locale) })}{" "}
            <Link href="/platformdij" className="font-medium text-forest underline decoration-mint underline-offset-2 hover:decoration-forest">
              {t("feeExplainerLink")}
            </Link>
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {t("toPayment")}
      </Button>
    </form>
  );
}
