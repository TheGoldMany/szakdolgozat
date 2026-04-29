"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations("applications");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleWithdraw() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setLoading(true);
    await fetch(`/api/applications/${applicationId}`, { method: "PATCH" });
    router.refresh();
  }

  return (
    <button
      onClick={handleWithdraw}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        confirmed
          ? "bg-red-500 text-white hover:bg-red-600"
          : "border border-gray-200 text-gray-500 hover:bg-gray-50"
      }`}
    >
      {loading ? "..." : confirmed ? t("withdrawConfirm") : t("withdraw")}
    </button>
  );
}
