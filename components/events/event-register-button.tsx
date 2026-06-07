"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck, X, CheckCircle, Users } from "lucide-react";

interface Props {
  eventId:    string;
  slug:       string;
  loggedIn:   boolean;
  isFull:     boolean;
  registered: boolean;
  initialGuests?: number;
}

export function EventRegisterButton({ eventId, slug, loggedIn, isFull, registered, initialGuests = 0 }: Props) {
  const t      = useTranslations("events");
  const tNav   = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [guests, setGuests]   = useState(initialGuests);
  const [note, setNote]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/events/${eventId}/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guests, note: note || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t("error")); return; }
    setOpen(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!confirm(t("cancelConfirm"))) return;
    setLoading(true); setError(null);
    const res = await fetch(`/api/events/${eventId}/register`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? t("error")); return; }
    router.refresh();
  }

  if (registered) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
        <p className="flex items-center gap-2 font-semibold text-green-800">
          <CheckCircle className="h-5 w-5" /> {t("registered")}
        </p>
        <p className="mt-1 text-sm text-green-600">{t("registeredDesc", { count: 1 + initialGuests })}</p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button onClick={handleCancel} disabled={loading}
          className="mt-3 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
          {loading ? "..." : t("cancelParticipation")}
        </button>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center">
        <p className="text-sm text-gray-600">{t("loginToRegister")}</p>
        <a href={`/auth/login?callbackUrl=/events/${slug}`}
          className="mt-3 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          {tNav("login")}
        </a>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center text-sm font-medium text-gray-500">
        {t("full")}
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
          <CalendarCheck className="h-4 w-4" /> {t("registerButton")}
        </button>
      ) : (
        <form onSubmit={handleRegister} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">{t("registerTitle")}</p>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">{t("guestsLabel")}</label>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <input type="number" min={0} max={20} value={guests}
                onChange={e => setGuests(Math.max(0, Number(e.target.value)))}
                className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
              <span className="text-xs text-gray-400">{t("guestsHint", { count: 1 + guests })}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">{t("noteLabel")}</label>
            <textarea rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            {loading ? t("submitting") : t("submitRegister")}
          </button>
        </form>
      )}
    </div>
  );
}
