"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";

type Sponsorship = {
  id:          string;
  status:      string;
  amount:      number;
  isPublic:    boolean;
  createdAt:   string;
  cancelledAt: string | null;
  animal:      { name: string; slug: string } | null;
};

export function SponsorshipsList({ sponsorships }: { sponsorships: Sponsorship[] }) {
  const t      = useTranslations("profile");
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  async function handleCancel(id: string) {
    if (!confirm(t("cancelSponsorConfirm"))) return;
    setLoading(id); setError(null);
    try {
      const res  = await fetch(`/api/sponsorships/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("networkError"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("networkError"));
    } finally {
      setLoading(null);
    }
  }

  if (sponsorships.length === 0) {
    return <p className="text-sm text-gray-500">{t("noSponsorships")}</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {sponsorships.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-sm">
            <p className="flex items-center gap-1.5 font-medium text-gray-800">
              <Heart className="h-3.5 w-3.5 text-pink-500" />
              {s.animal?.name ?? t("unknownAnimal")}
            </p>
            <p className="text-gray-500">{s.amount.toLocaleString("hu-HU")} {t("perMonth")}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {s.isPublic ? t("publicSponsor") : t("anonSponsor")} ·{" "}
              {new Date(s.createdAt).toLocaleDateString()} {t("sponsoredSince")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {s.status === "CANCELLED" ? (
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-500">{t("cancelled")}</span>
            ) : (
              <>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">{t("activeStatus")}</span>
                <button onClick={() => handleCancel(s.id)} disabled={loading === s.id}
                  className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                  {loading === s.id ? "..." : t("cancelSponsorship")}
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
