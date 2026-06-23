"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface TierCardProps {
  tier: {
    id:          string;
    name:        string;
    description: string | null;
    amount:      number;
    _count:      { subscriptions: number };
  };
  isSubscribed?: boolean;
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

export function TierCard({ tier, isSubscribed = false }: TierCardProps) {
  const router  = useRouter();
  const t = useTranslations("donate");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tierId: tier.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Hiba történt");
      }
      const { url } = await res.json();
      if (url) router.push(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm gap-4">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">{tier.name}</h3>
        <p className="text-2xl font-bold text-brand-600">
          {formatHUF(tier.amount)}
          <span className="text-sm font-normal text-gray-400"> {t("perMonth")}</span>
        </p>
      </div>

      {tier.description && (
        <p className="text-sm text-gray-500 leading-relaxed flex-1">{tier.description}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>{t("subscribers", { count: tier._count.subscriptions })}</span>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {isSubscribed ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Már feliratkoztál
        </div>
      ) : (
        <Button onClick={handleSubscribe} loading={loading} className="w-full">
          {t("subscribe")}
        </Button>
      )}
    </div>
  );
}
