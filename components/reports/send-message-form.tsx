"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface Props {
  reportId: string;
}

export function SendMessageForm({ reportId }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch(`/api/reports/${reportId}/message`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Hiba történt.");
        return;
      }
      setSuccess(true);
      setMessage("");
    } catch {
      setError("Hálózati hiba. Próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
        Üzeneted elküldtük a bejelentő email-jére.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Írd meg az üzeneted a bejelentő számára..."
        required
        rows={4}
        className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition resize-none"
      />
      <button
        type="submit"
        disabled={loading || message.length < 10}
        className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        <Send className="h-4 w-4" />
        {loading ? "Küldés..." : "Üzenet küldése"}
      </button>
    </form>
  );
}
