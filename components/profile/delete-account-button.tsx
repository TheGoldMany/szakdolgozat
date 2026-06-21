"use client";

import { useState } from "react";
import { signOut }  from "next-auth/react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";

const CONFIRM_WORD = "TÖRLÉS";

export function DeleteAccountButton() {
  const t = useTranslations("profile");
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleDelete() {
    if (input !== CONFIRM_WORD) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? t("deleteError"));
        setLoading(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError(t("deleteError"));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        {t("deleteAccount")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">{t("deleteAccountTitle")}</h2>
              </div>
              <button onClick={() => { setOpen(false); setInput(""); setError(""); }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 space-y-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">{t("deleteWarningTitle")}</p>
              <ul className="ml-4 list-disc space-y-1 text-red-700">
                <li>{t("deleteWarning1")}</li>
                <li>{t("deleteWarning2")}</li>
                <li>{t("deleteWarning3")}</li>
                <li>{t("deleteWarning4")}</li>
              </ul>
              <p className="mt-2 text-xs text-red-600">{t("deleteFinancialNote")}</p>
            </div>

            <p className="mb-2 text-sm text-gray-600">
              {t("deleteConfirmPrompt", { word: CONFIRM_WORD })}
            </p>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder={CONFIRM_WORD}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { setOpen(false); setInput(""); setError(""); }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                {t("deleteCancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={input !== CONFIRM_WORD || loading}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {loading ? t("deleteInProgress") : t("deleteConfirmButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
