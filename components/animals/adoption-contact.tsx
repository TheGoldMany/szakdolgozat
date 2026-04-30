"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MessageCircle, Phone, Mail, Loader2 } from "lucide-react";

interface AdoptionContactProps {
  animalId: string;
  animalName: string;
  shelter: { phone: string | null; email: string | null };
}

export function AdoptionContact({ animalId, animalName, shelter }: AdoptionContactProps) {
  const t      = useTranslations("animals");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function startConversation() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animalId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? t("networkError")); return; }
      router.push(`/messages/${json.conversationId}`);
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {t("interestedIn", { name: animalName })}{" "}
        {t("interestedDesc")}
      </p>

      {(shelter.phone || shelter.email) && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("shelterContactTitle")}</p>
          {shelter.phone && (
            <a href={`tel:${shelter.phone}`} className="flex items-center gap-2 text-sm text-brand-500 hover:underline">
              <Phone className="h-4 w-4 shrink-0" />{shelter.phone}
            </a>
          )}
          {shelter.email && (
            <a href={`mailto:${shelter.email}`} className="flex items-center gap-2 text-sm text-brand-500 hover:underline">
              <Mail className="h-4 w-4 shrink-0" />{shelter.email}
            </a>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        onClick={startConversation}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        {loading ? t("opening") : t("sendMessage")}
      </button>
    </div>
  );
}
