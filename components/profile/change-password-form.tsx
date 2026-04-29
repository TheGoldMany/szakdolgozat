"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

const cls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition";

export function ChangePasswordForm() {
  const t = useTranslations("profile");
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError("");

    if (next !== confirm) {
      setError(t("passwordsDontMatch"));
      return;
    }
    if (next.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t("networkError"));
        return;
      }
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {t("passwordChanged")}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("currentPassword")}</label>
        <div className="relative">
          <input type={showPw ? "text" : "password"} value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="••••••••" required className={`${cls} pr-10`} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("newPassword")}</label>
        <input type={showPw ? "text" : "password"} value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder={t("atLeast8Chars")} required className={cls} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("confirmNewPassword")}</label>
        <input type={showPw ? "text" : "password"} value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("repeatPassword")} required className={cls} />
      </div>

      <button type="submit" disabled={loading}
        className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
        {loading ? t("changingPassword") : t("changePasswordButton")}
      </button>
    </form>
  );
}
