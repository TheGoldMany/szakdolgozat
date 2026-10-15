"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function ResolveButton({ reportId }: { reportId: string }) {
  const t = useTranslations("reports");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("resolveSuccess"));
      router.refresh();
    } catch {
      toast.error(t("resolveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleResolve}
      disabled={loading}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-graphite transition-colors hover:border-brand-600 hover:text-brand-700 disabled:opacity-60"
    >
      <CheckCircle2 className="h-4 w-4" />
      {loading ? "…" : t("resolveButton")}
    </button>
  );
}
