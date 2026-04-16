"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TierCardProps {
  tier: {
    id:          string;
    name:        string;
    description: string | null;
    amount:      number;
    _count:      { subscriptions: number };
  };
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

export function TierCard({ tier }: TierCardProps) {
  const router  = useRouter();
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
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm gap-4 min-w-[220px]">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">{tier.name}</h3>
        <p className="text-2xl font-bold text-brand-600">
          {formatHUF(tier.amount)}
          <span className="text-sm font-normal text-gray-400"> / hó</span>
        </p>
      </div>

      {tier.description && (
        <p className="text-sm text-gray-500 leading-relaxed flex-1">{tier.description}</p>
      )}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>{tier._count.subscriptions} előfizető</span>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button onClick={handleSubscribe} loading={loading} className="w-full">
        Feliratkozás
      </Button>
    </div>
  );
}
