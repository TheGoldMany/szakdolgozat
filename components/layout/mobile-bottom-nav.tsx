"use client";

import { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PawPrint, HandHeart, MapPin, FileWarning, User, LogIn, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { paymentsEnabled } from "@/lib/payments-enabled";

interface Tab {
  href:  string;
  label: string;
  icon:  LucideIcon;
  /** Állandóan kiemelt fül: inaktívan sem halványul el a többivel. */
  highlight?: boolean;
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
    // Fizetés kikapcsolva: a sáv négy fülre szűkül, nem marad üres hely.
    ...(paymentsEnabled() ? [{ href: "/donate", label: t("donate"), icon: HandHeart }] : []),
    { href: "/map",     label: t("map"),     icon: MapPin },
    // A bejelentés a platform legidőérzékenyebb művelete: egy kóbor állatot
    // MOST látnak meg. Ezért akkor is kiemelve marad, ha a látogató épp más
    // oldalon van — nem kell megkeresnie, amikor sürgős lenne.
    { href: "/reports", label: t("reports"), icon: FileWarning, highlight: true },
    loggedIn
      ? { href: "/profile",    label: t("profile"), icon: User }
      : { href: "/auth/login", label: t("login"),   icon: LogIn },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // A jelölő csík ehhez a fülhöz csúszik. -1, ha egyik fülön sem vagyunk
  // (pl. kezdőlap): ilyenkor eltűnik, de a helyét megjegyzi, így a
  // visszatéréskor onnan indul, nem a bal szélről.
  // Nyitott billentyűzetnél (szövegmező fókuszban) az alsó sáv, a tapadó
  // örökbefogadási sáv és a lebegő gomb eltűnik: iOS-en a billentyűzet fölé
  // ugranak, és épp a kitöltött mezőt takarnák. A body jelzőjére a
  // globals.css rejti el őket.
  useEffect(() => {
    const isTextField = (el: EventTarget | null) =>
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLInputElement && !["checkbox", "radio", "range", "button", "submit", "file", "color"].includes(el.type)) ||
      (el instanceof HTMLElement && el.isContentEditable);
    const onIn  = (e: FocusEvent) => { if (isTextField(e.target)) document.body.dataset.keyboard = "open"; };
    const onOut = () => {
      // A következő fókusz még nem ismert: egy pillanat múlva nézzük meg.
      setTimeout(() => { if (!isTextField(document.activeElement)) delete document.body.dataset.keyboard; }, 50);
    };
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      delete document.body.dataset.keyboard;
    };
  }, []);

  const activeIndex = tabs.findIndex((tab) => isActive(tab.href));
  const lastIndex   = useRef(0);
  if (activeIndex >= 0) lastIndex.current = activeIndex;

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 overflow-hidden border-t border-gray-200 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label={t("openMenu")}
    >
      {/* Csúszó jelölő: átvándorol a megnyitott fülhöz, így a szem követni
          tudja, honnan hová került a kijelölés.

          A szélesség a FÜLEK SZÁMÁBÓL jön, nem fix 20%-ból: a fizetés
          kikapcsolásával a Támogatás füle eltűnt, és a beégetett ötös
          osztásból egy üres hasáb maradt volna a sáv jobb szélén. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 block transition-[transform,opacity] duration-300 ease-out"
        style={{
          width:     `${100 / tabs.length}%`,
          transform: `translateX(${lastIndex.current * 100}%)`,
          opacity:   activeIndex >= 0 ? 1 : 0,
        }}
      >
        <span className="mx-auto block h-0.5 w-8 rounded-full bg-brand-500" />
      </span>

      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ href, label, icon: Icon, highlight }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  active
                    ? "text-brand-600"
                    // A kiemelt fül inaktívan sem halványul el, mint a többi.
                    : highlight
                    ? "text-forest"
                    : "text-gray-400 hover:text-gray-600",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "animate-pop")}
                  strokeWidth={active || highlight ? 2.4 : 2}
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
