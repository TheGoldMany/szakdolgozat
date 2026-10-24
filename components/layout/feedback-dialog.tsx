"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, MessageSquareWarning, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const INBOX = "info@allatimenhelyek.hu";
type Category = "BUG" | "IDEA" | "OTHER";
type State = "idle" | "sending" | "sent" | "error" | "unavailable";

/**
 * Visszajelzés az oldalról: hiba, ötlet, egyéb. E-mailben megy az
 * üzemeltetőnek, az aktuális oldal címével együtt, hogy a hiba
 * visszakereshető legyen.
 */
export function FeedbackDialog() {
  const t = useTranslations("feedback");
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState<Category>("BUG");
  const [message, setMessage]   = useState("");
  const [email, setEmail]       = useState("");
  const [state, setState]       = useState<State>("idle");
  const [error, setError]       = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const honeypot    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    if (state === "sent") {
      setMessage(""); setEmail(""); setState("idle");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          category, message, email,
          pageUrl: window.location.href,
          _hp:     honeypot.current?.value ?? "",
        }),
      });
      if (res.ok) { setState("sent"); return; }
      const body = await res.json().catch(() => ({}));
      if (res.status === 503) { setState("unavailable"); return; }
      setError(typeof body.error === "string" ? body.error : t("error"));
      setState("error");
    } catch {
      setError(t("error"));
      setState("error");
    }
  }

  const mailto = `mailto:${INBOX}?subject=${encodeURIComponent(t("mailSubject"))}&body=${encodeURIComponent(message)}`;
  const inputCls = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-brand-600 transition-colors"
      >
        <MessageSquareWarning className="h-4 w-4" aria-hidden />
        {t("trigger")}
      </button>

      {/* A body alá kerül: a lábléc rétegzése nem takarhatja ki a hátteret. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={close} />
          <div className="animate-sheet-up relative w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:pb-5">
            <button type="button" onClick={close} aria-label={t("close")}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>

            {state === "sent" ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" aria-hidden />
                <h2 id="feedback-title" className="mt-3 text-lg font-bold text-gray-900">{t("successTitle")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("successDesc")}</p>
                <Button className="mt-5" variant="secondary" onClick={close}>{t("close")}</Button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 id="feedback-title" className="pr-8 text-lg font-bold text-gray-900">{t("title")}</h2>
                <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>

                <fieldset className="mt-4">
                  <legend className="mb-1.5 text-xs font-semibold text-gray-600">{t("categoryLabel")}</legend>
                  <div className="flex gap-2">
                    {(["BUG", "IDEA", "OTHER"] as const).map((c) => (
                      <label key={c} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors ${
                        category === c ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        <input type="radio" name="category" value={c} checked={category === c}
                          onChange={() => setCategory(c)} className="sr-only" />
                        {t(`category${c}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label htmlFor="feedback-message" className="mb-1 mt-4 block text-xs font-semibold text-gray-600">{t("messageLabel")}</label>
                <textarea id="feedback-message" ref={textareaRef} required minLength={5} maxLength={3000} rows={5}
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("messagePlaceholder")} className={inputCls} />

                <label htmlFor="feedback-email" className="mb-1 mt-3 block text-xs font-semibold text-gray-600">{t("emailLabel")}</label>
                <input id="feedback-email" type="email" autoComplete="email" maxLength={200}
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")} className={inputCls} />
                <p className="mt-1 text-xs text-gray-500">{t("emailHint")}</p>

                {/* Csapda-mező botok ellen: ember nem látja, nem tölti ki. */}
                <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off"
                  aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                {state === "error" && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
                {state === "unavailable" && (
                  <p className="mt-3 text-sm text-amber-700" role="alert">
                    {t("unavailable")}{" "}
                    <a href={mailto} className="font-semibold underline">{INBOX}</a>
                  </p>
                )}

                <div className="mt-5 flex gap-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={close}>{t("cancel")}</Button>
                  <Button type="submit" className="flex-1" loading={state === "sending"}>
                    {state === "sending" ? t("sending") : t("send")}
                  </Button>
                </div>
                <p className="mt-3 text-center text-[11px] text-gray-400">{t("pageNote")}</p>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
