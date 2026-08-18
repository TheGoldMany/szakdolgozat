"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingCampaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  createdAt: string;
  user: { name: string | null; email: string | null } | null;
  shelter: { name: string } | null;
}

interface CampaignApprovalsProps {
  campaigns: PendingCampaign[];
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

export function CampaignApprovals({ campaigns: initial }: CampaignApprovalsProps) {
  const t = useTranslations("dashboard");
  const [campaigns, setCampaigns] = useState<PendingCampaign[]>(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(id: string, action: "APPROVE" | "REJECT") {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("analyticsError"));
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("campaignsError"));
    } finally {
      setLoadingId(null);
    }
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
        <CheckCircle2 className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">{t("campaignsPending")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {campaigns.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5 flex-1">
              <h3 className="font-semibold text-gray-900 leading-snug">{c.title}</h3>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>
                  {t("campaignsSubmitter")}{" "}
                  <span className="font-medium text-gray-700">
                    {c.user?.name ?? c.user?.email ?? t("campaignsAnonymous")}
                  </span>
                </span>
                {c.shelter && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="font-medium text-brand-600">{c.shelter.name}</span>
                  </>
                )}
                <span className="text-gray-300">·</span>
                <span>
                  {t("campaignsTargetAmount")}{" "}
                  <span className="font-medium text-gray-700">{formatHUF(c.targetAmount)}</span>
                </span>
                <span className="text-gray-300">·</span>
                <span>
                  {new Date(c.createdAt).toLocaleDateString("hu-HU", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                {c.description}
              </p>
            </div>

            <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
              <Button
                size="sm"
                onClick={() => handleAction(c.id, "APPROVE")}
                loading={loadingId === c.id}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("campaignsApprove")}
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleAction(c.id, "REJECT")}
                loading={loadingId === c.id}
                className="gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                {t("campaignsReject")}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
