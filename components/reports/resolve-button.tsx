"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={handleResolve}
      disabled={loading}
      className="w-full rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 transition-colors"
    >
      {loading ? "..." : "✓ Megjelölés megoldottként"}
    </button>
  );
}
