"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface Props {
  applicationId: string;
  animalName:    string;
}

export function ContractDownloadButton({ applicationId, animalName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/contract`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Hiba történt");
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `szerzodes-${animalName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Nem sikerült letölteni");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <FileDown className="h-4 w-4" />}
        {loading ? "Generálás…" : "Szerződés letöltése"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
