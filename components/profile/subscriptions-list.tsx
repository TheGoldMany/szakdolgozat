"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Tier = {
  name:    string;
  amount:  number;
  shelter: { name: string; slug: string } | null;
};

type Subscription = {
  id:          string;
  status:      string;
  createdAt:   string;
  cancelledAt: string | null;
  tier:        Tier;
};

export function SubscriptionsList({ subscriptions }: { subscriptions: Subscription[] }) {
  const t      = useTranslations("profile");
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function handleCancel(id: string) {
    if (!confirm(t("cancelConfirm"))) return;
    setLoading(id);
    setError(null);
    try {
      const res  = await fetch(`/api/subscriptions/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("networkError"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("networkError"));
    } finally {
      setLoading(null);
    }
  }

  if (subscriptions.length === 0) {
    return <p className="text-sm text-gray-500">{t("noSubscriptions")}</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {subscriptions.map((sub) => (
        <div key={sub.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-gray-800">
              {sub.tier.shelter?.name ?? t("unknownShelter")} – {sub.tier.name}
            </p>
            <p className="text-gray-500">{sub.tier.amount.toLocaleString("hu-HU")} Ft / hó</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {t("subscribedSince")} {new Date(sub.createdAt).toLocaleDateString("hu-HU")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sub.status === "CANCELLED" ? (
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-500">{t("cancelled")}</span>
            ) : (
              <>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">{t("activeStatus")}</span>
                <button
                  onClick={() => handleCancel(sub.id)}
                  disabled={loading === sub.id}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {loading === sub.id ? "..." : t("cancelSubscription")}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
