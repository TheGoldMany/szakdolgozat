"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface Props {
  subscriptionId: string;
}

export function SubscriptionCancelButton({ subscriptionId }: Props) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm(t("subscriptionsCancelConfirm"));
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/${subscriptionId}/admin-cancel`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(t("subscriptionsCancelSuccess"));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? t("subscriptionsCancelError"));
      }
    } catch {
      toast.error(t("subscriptionsCancelError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
    >
      {loading && (
        <svg
          className="h-3 w-3 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {t("subscriptionsCancelButton")}
    </button>
  );
}
