"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type ExportType = "animals" | "applications" | "volunteers" | "sponsorships" | "events" | "subscribers" | "donations";

interface Props {
  type:   ExportType;
  label?: string;
}

export function ExportButton({ type, label = "CSV export" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) throw new Error("Export sikertelen");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const cd   = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/);
      a.href     = url;
      a.download = match?.[1] ?? `export-${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Az export nem sikerült. Kérjük, próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {loading ? "Exportálás…" : label}
    </button>
  );
}
