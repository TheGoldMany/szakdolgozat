"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Home, PawPrint, MapPin, MessageCircle, User, LogIn, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  href:  string;
  label: string;
  icon:  LucideIcon;
  badge?: number;
}

/**
 * Hüvelykujjal elérhető alsó navigáció mobilon (md alatt).
 * A dashboardon nem jelenik meg, mert az külön layoutot használ.
 */
export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unread, setUnread] = useState(0);

  const loggedIn = !!session?.user?.id;

  useEffect(() => {
    if (!loggedIn) return;
    const load = () =>
      fetch("/api/messages/unread")
        .then((r) => r.json())
        .then((d) => setUnread(d.count ?? 0))
        .catch(() => {});
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);
    return () => clearInterval(id);
  }, [loggedIn]);

  const tabs: Tab[] = [
    { href: "/",        label: t("home"),    icon: Home },
    { href: "/animals", label: t("animals"), icon: PawPrint },
    { href: "/map",     label: t("map"),     icon: MapPin },
    loggedIn
      ? { href: "/messages", label: t("messages"), icon: MessageCircle, badge: unread }
      : { href: "/reports",  label: t("reports"),  icon: MapPin },
    loggedIn
      ? { href: "/profile",    label: t("profile"), icon: User }
      : { href: "/auth/login", label: t("login"),   icon: LogIn },
  ];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("openMenu")}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(href);
          return (
            <li key={label}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-gray-400 hover:text-gray-600",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  {badge != null && badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
