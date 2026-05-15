"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FormApprovalActionsProps {
  formId: string;
}

export function FormApprovalActions({ formId }: FormApprovalActionsProps) {
  const router                          = useRouter();
  const [loading, setLoading]           = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject]     = useState(false);
  const [error, setError]               = useState("");

  async function handleApprove() {
    setError("");
    setLoading("approve");
    try {
      const res = await fetch(`/api/application-forms/${formId}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Jóváhagyás sikertelen");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setError("");
    setLoading("reject");
    try {
      const res = await fetch(`/api/application-forms/${formId}/reject`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: rejectReason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Elutasítás sikertelen");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading !== null}
          className={cn(
            "rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors",
            loading !== null && "opacity-50 cursor-not-allowed"
          )}
        >
          {loading === "approve" ? "..." : "Jóváhagyás"}
        </button>
        <button
          type="button"
          onClick={() => setShowReject(!showReject)}
          disabled={loading !== null}
          className={cn(
            "rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors",
            loading !== null && "opacity-50 cursor-not-allowed"
          )}
        >
          Elutasítás
        </button>
      </div>
      {showReject && (
        <div className="space-y-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Elutasítás oka (opcionális)"
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            type="button"
            onClick={handleReject}
            disabled={loading !== null}
            className={cn(
              "rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors",
              loading !== null && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading === "reject" ? "..." : "Elutasítás megerősítése"}
          </button>
        </div>
      )}
    </div>
  );
}
