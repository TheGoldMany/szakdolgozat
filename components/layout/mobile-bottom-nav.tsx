"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PawPrint, HandHeart, MapPin, FileWarning, User, LogIn, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  href:  string;
  label: string;
  icon:  LucideIcon;
}

/**
 * Hüvelykujjal elérhető alsó navigáció mobilon (md alatt).
 *
 * A négy fő belépési pontot tartja kéznél, ugyanabban a sorrendben, mint a
 * fejléc. A kezdőlap szándékosan nincs itt: a fejléc logója mindig látszik és
 * oda visz, így ez a hely a fontos aloldalaké marad.
 * A dashboardon nem jelenik meg, mert az külön layoutot használ.
 */
export function MobileBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { data: session } = useSession();

  const loggedIn = !!session?.user?.id;

  const tabs: Tab[] = [
    { href: "/animals", label: t("animals"), icon: PawPrint },
    { href: "/donate",  label: t("donate"),  icon: HandHeart },
    { href: "/map",     label: t("map"),     icon: MapPin },
    { href: "/reports", label: t("reports"), icon: FileWarning },
    loggedIn
      ? { href: "/profile",    label: t("profile"), icon: User }
      : { href: "/auth/login", label: t("login"),   icon: LogIn },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("openMenu")}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-gray-400 hover:text-gray-600",
                )}
              >
                {/* A pont fölötte + az ikon pattanása jelzi, melyik fülre
                    értünk át – színnel egyedül nehezebb elkapni menet közben. */}
                <span
                  aria-hidden
                  className={cn(
                    "block h-1 w-1 rounded-full bg-brand-500 transition-opacity duration-200",
                    active ? "animate-pop opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn("h-5 w-5", active && "animate-pop")}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className="max-w-full truncate px-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
