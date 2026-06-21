"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

interface EmailNotificationsToggleProps {
  enabled: boolean;
}

export function EmailNotificationsToggle({ enabled }: EmailNotificationsToggleProps) {
  const t = useTranslations("profile");
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !isEnabled;
    setIsEnabled(next);
    startTransition(async () => {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ emailNotifications: next }),
      });
      if (!res.ok) {
        setIsEnabled(!next);
        toast.error(t("networkError"));
      } else {
        toast.success(next ? t("emailNotifEnabled") : t("emailNotifDisabled"));
      }
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isEnabled
          ? <Bell className="h-4 w-4 text-brand-500" />
          : <BellOff className="h-4 w-4 text-gray-400" />}
        <div>
          <p className="text-sm font-medium text-gray-800">{t("emailNotifLabel")}</p>
          <p className="text-xs text-gray-400">{t("emailNotifDesc")}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={isEnabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
          isEnabled ? "bg-brand-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isEnabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
