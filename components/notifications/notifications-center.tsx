"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Bell, Check, Trash2, CheckCheck, Loader2,
  Calendar, FileText, HandHeart, Home, Megaphone, ClipboardList,
  MapPin, Heart, CreditCard, Star, CalendarDays, MessageCircle,
  ClipboardCheck, Package, ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string | null;
  href:      string | null;
  readAt:    string | null;
  createdAt: string;
}

// Notification type → icon + accent color
function iconFor(type: string): { Icon: React.ElementType; color: string } {
  if (type.startsWith("APPOINTMENT"))   return { Icon: Calendar,       color: "text-blue-500 bg-blue-50" };
  if (type.startsWith("APPLICATION"))   return { Icon: FileText,       color: "text-brand-500 bg-brand-50" };
  if (type.startsWith("VOLUNTEER") || type === "TASK_SIGNUP")
                                        return { Icon: HandHeart,      color: "text-emerald-500 bg-emerald-50" };
  if (type.startsWith("FOSTER"))        return { Icon: Home,           color: "text-orange-500 bg-orange-50" };
  if (type.startsWith("CAMPAIGN"))      return { Icon: Megaphone,      color: "text-pink-500 bg-pink-50" };
  if (type.startsWith("FORM"))          return { Icon: ClipboardList,  color: "text-indigo-500 bg-indigo-50" };
  if (type.startsWith("REPORT"))        return { Icon: MapPin,         color: "text-red-500 bg-red-50" };
  if (type.startsWith("DONATION") || type.startsWith("SUBSCRIPTION"))
                                        return { Icon: CreditCard,     color: "text-green-600 bg-green-50" };
  if (type.startsWith("SPONSOR"))       return { Icon: Heart,          color: "text-rose-500 bg-rose-50" };
  if (type.startsWith("EVENT"))         return { Icon: CalendarDays,   color: "text-purple-500 bg-purple-50" };
  if (type === "NEW_MESSAGE")           return { Icon: MessageCircle,  color: "text-cyan-500 bg-cyan-50" };
  if (type.startsWith("FOLLOW_UP"))     return { Icon: ClipboardCheck, color: "text-teal-500 bg-teal-50" };
  if (type.startsWith("INVENTORY"))     return { Icon: Package,        color: "text-amber-500 bg-amber-50" };
  if (type.startsWith("TRANSFER"))      return { Icon: ArrowRightLeft, color: "text-violet-500 bg-violet-50" };
  return { Icon: Star, color: "text-gray-400 bg-gray-50" };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1)  return "most";
  if (diffMin < 60) return `${diffMin} perce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} órája`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD} napja`;
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" });
}

export function NotificationsCenter() {
  const router = useRouter();
  const t = useTranslations("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [filter,        setFilter]        = useState<"all" | "unread">("all");
  const [loading,       setLoading]       = useState(true);
  const [busyId,        setBusyId]        = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=100${filter === "unread" ? "&filter=unread" : ""}`);
      const d = await res.json();
      setNotifications(d.notifications ?? []);
      setUnreadCount(d.unreadCount ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function markRead(n: Notification, navigate: boolean) {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (navigate && n.href) router.push(n.href);
  }

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.readAt) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    } finally {
      setBusyId(null);
    }
  }

  const shown = filter === "unread" ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === "all" ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {t("all")}
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === "unread" ? "bg-brand-500 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            {t("unread")}
            {unreadCount > 0 && (
              <span className={cn(
                "rounded-full px-1.5 text-[10px] font-bold",
                filter === "unread" ? "bg-white/25 text-white" : "bg-red-500 text-white"
              )}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <CheckCheck className="h-4 w-4" />
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">
            {filter === "unread" ? t("noUnread") : t("empty")}
          </p>
          <p className="mt-1 text-sm text-gray-400">{t("emptyDesc")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((n) => {
            const { Icon, color } = iconFor(n.type);
            const clickable = !!n.href;
            return (
              <li
                key={n.id}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors",
                  n.readAt ? "border-gray-100" : "border-brand-200 bg-brand-50/40"
                )}
              >
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
                  <Icon className="h-5 w-5" />
                </span>

                <button
                  onClick={() => markRead(n, true)}
                  disabled={!clickable && !!n.readAt}
                  className={cn("min-w-0 flex-1 text-left", clickable && "cursor-pointer")}
                >
                  <div className="flex items-center gap-2">
                    {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    <p className="truncate text-sm font-semibold text-gray-800">{n.title}</p>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>}
                  <p className="mt-1 text-xs text-gray-400">{formatTime(n.createdAt)}</p>
                </button>

                <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  {!n.readAt && (
                    <button
                      onClick={() => markRead(n, false)}
                      title={t("markRead")}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-500 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => remove(n.id)}
                    disabled={busyId === n.id}
                    title={t("delete")}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {busyId === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
