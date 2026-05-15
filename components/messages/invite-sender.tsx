"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface ApprovedForm {
  id:    string;
  title: string;
}

interface InviteSenderProps {
  conversationId: string;
  approvedForms:  ApprovedForm[];
}

export function InviteSender({ conversationId, approvedForms }: InviteSenderProps) {
  const router                    = useRouter();
  const [formId, setFormId]       = useState(approvedForms[0]?.id ?? "");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  async function handleSend() {
    if (!formId) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/invite`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ formId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Meghívó küldése sikertelen");
      }
      setSuccess(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Meghívó sikeresen elküldve!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-700">Kérvény meghívó küldése</p>
      {approvedForms.length === 0 ? (
        <p className="text-xs text-gray-500">
          Nincs jóváhagyott kérvény sablon. Hozz létre és hagyd jóvá egy sablont előbb.
        </p>
      ) : (
        <>
          <select
            value={formId}
            onChange={(e) => setFormId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {approvedForms.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !formId}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm",
              (sending || !formId) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
            {sending ? "Küldés..." : "Meghívó küldése"}
          </button>
        </>
      )}
    </div>
  );
}
