"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string | null;
  href:      string | null;
  readAt:    string | null;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
  const t = useTranslations("nav");
  const { data: session } = useSession();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = () =>
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      })
      .catch(() => {});

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchNotifications();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchNotifications();
    }, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchNotifications(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markRead(n: Notification) {
    setOpen(false);
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.href) router.push(n.href);
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (diffMin < 1)  return "< 1 min";
    if (diffMin < 60) return `${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `${diffH}h`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-brand-500 transition-colors"
        aria-label={t("notifications")}
      >
        <span className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-800">{t("notifications")}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-brand-500 hover:text-brand-600 font-medium"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">{t("noNotifications")}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors hover:bg-gray-50",
                    !n.readAt && "bg-brand-50"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {!n.readAt && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                    <div className={cn("flex-1 min-w-0", n.readAt && "ml-4.5")}>
                      <p className="truncate text-sm font-medium text-gray-800">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-brand-500 hover:bg-gray-50 transition-colors"
          >
            {t("viewAllNotifications")}
          </Link>
        </div>
      )}
    </div>
  );
}
