"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApplicationReviewProps {
  applicationId: string;
  currentStatus: string;
}

export function ApplicationReview({ applicationId, currentStatus }: ApplicationReviewProps) {
  const router = useRouter();
  const [loading, setLoading]   = useState<string | null>(null);
  const [notes, setNotes]       = useState("");
  const [showNotes, setShowNotes] = useState(false);

  async function update(status: string) {
    setLoading(status);
    await fetch(`/api/dashboard/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNotes: notes || undefined }),
    });
    setLoading(null);
    router.refresh();
  }

  if (currentStatus === "APPROVED" || currentStatus === "REJECTED") {
    return (
      <span className="text-xs text-gray-400 italic">Lezárva</span>
    );
  }

  return (
    <div className="space-y-2">
      {showNotes && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Megjegyzés (opcionális)..."
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {currentStatus === "PENDING" && (
          <button
            onClick={() => update("REVIEWING")}
            disabled={!!loading}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {loading === "REVIEWING" ? "..." : "Elbírálás alatt"}
          </button>
        )}
        <button
          onClick={() => update("APPROVED")}
          disabled={!!loading}
          className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          {loading === "APPROVED" ? "..." : "✓ Elfogad"}
        </button>
        <button
          onClick={() => update("REJECTED")}
          disabled={!!loading}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {loading === "REJECTED" ? "..." : "✗ Elutasít"}
        </button>
        <button
          onClick={() => setShowNotes((v) => !v)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          {showNotes ? "Mégse" : "Megjegyzés"}
        </button>
      </div>
    </div>
  );
}
