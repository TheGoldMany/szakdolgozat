"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Menu, X, MessageCircle, Globe, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, { label: string }> = {
  hu: { label: "Magyar"  },
  en: { label: "English" },
  de: { label: "Deutsch" },
  pl: { label: "Polski"  },
};

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN:   "bg-red-100 text-red-700",
  SHELTER_ADMIN: "bg-brand-100 text-brand-700",
  USER:          "bg-gray-100 text-gray-600",
};

export function Header() {
  const t = useTranslations("nav");
  const locale  = useLocale();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router  = useRouter();

  const { data: session } = useSession();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const [unread,       setUnread]       = useState(0);

  // A négy fő belépési pont mindig látszik; a többi a "Továbbiak" alá kerül,
  // hogy a fejléc ne mossa össze a fontosat a ritkán használttal.
  const PRIMARY_LINKS = [
    { href: "/animals", label: t("animals") },
    { href: "/donate",  label: t("donate")  },
    { href: "/map",     label: t("map")     },
    { href: "/reports", label: t("reports") },
  ];
  const SECONDARY_LINKS = [
    { href: "/shelters", label: t("shelters") },
    { href: "/events",   label: t("events")   },
    { href: "/articles", label: t("articles") },
  ];

  // Prevent body scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetch_ = () =>
      fetch("/api/messages/unread")
        .then((r) => r.json())
        .then((d) => setUnread(d.count ?? 0))
        .catch(() => {});
    fetch_();
    // Csak aktív fülnél pollozunk
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetch_();
    }, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetch_(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.user?.id]);

  function switchLocale(newLocale: string) {
    setLangMenuOpen(false);
    const qs = searchParams.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { locale: newLocale });
  }

  const isAdmin =
    session?.user?.role === "SHELTER_ADMIN" ||
    session?.user?.role === "SUPER_ADMIN";

  const ROLE_LABEL: Record<string, string> = {
    SUPER_ADMIN:   t("roleSuperAdmin"),
    SHELTER_ADMIN: t("roleShelterAdmin"),
    USER:          t("roleUser"),
  };

  const roleInfo = session?.user?.role
    ? { label: ROLE_LABEL[session.user.role] ?? t("roleUser"), color: ROLE_COLOR[session.user.role] ?? "bg-gray-100 text-gray-600" }
    : null;

  const currentLocale = LOCALE_LABELS[locale] ?? LOCALE_LABELS.hu;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo – mobilon is kiírjuk a nevet: ott a fejlécben csak a logó és a
            menügomb van, tehát bőven elfér, és a látogató tudja, hol jár. */}
        <Link href="/" className="flex items-center gap-2" aria-label="ÁllatiMenhelyek.hu">
          <Image
            src="/logo-mark.png"
            alt=""
            width={32}
            height={32}
            priority
            className="h-8 w-8 shrink-0"
          />
          <Image
            src="/logo-wordmark.png"
            alt="ÁllatiMenhelyek.hu"
            width={509}
            height={43}
            priority
            className="h-4 w-auto sm:h-[18px]"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {PRIMARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-500"
            >
              {l.label}
            </Link>
          ))}

          {/* Másodlagos menüpontok */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-brand-500"
              aria-expanded={moreOpen}
            >
              {t("more")}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <>
                {/* Kattintás bárhová: bezárás */}
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute left-0 z-50 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg">
                  {SECONDARY_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMoreOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen((v) => !v)}
              aria-label={`${t("language")}: ${currentLocale.label}`}
              title={`${t("language")}: ${currentLocale.label}`}
              className="flex items-center rounded-xl p-2 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Globe className="h-4 w-4" />
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg z-50">
                {routing.locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50",
                      loc === locale ? "font-semibold text-brand-600" : "text-gray-700"
                    )}
                  >
                    {LOCALE_LABELS[loc].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {session ? (
            <>
              {/* Notifications */}
              <NotificationBell />

              {/* Messages */}
              <Link
                href="/messages"
                aria-label={t("messages")}
                title={t("messages")}
                className="relative flex items-center rounded-xl p-2 text-gray-600 hover:bg-gray-50 hover:text-brand-500 transition-colors"
              >
                <span className="relative">
                  <MessageCircle className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
              </Link>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 bg-brand-100 text-sm font-semibold text-brand-600 hover:border-brand-400 focus:outline-none"
                >
                  {session.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt={session.user.name ?? "Avatar"} className="h-full w-full object-cover" />
                  ) : (
                    (session.user?.name ?? "?")[0].toUpperCase()
                  )}
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg z-50">
                    <div className="px-4 pb-2 pt-2">
                      <p className="truncate text-sm font-semibold text-gray-800">{session.user?.name}</p>
                      <p className="truncate text-xs text-gray-500">{session.user?.email}</p>
                      {roleInfo && (
                        <span className={cn("mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", roleInfo.color)}>
                          {roleInfo.label}
                        </span>
                      )}
                    </div>
                    <hr className="mb-1 border-gray-100" />
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {t("profile")}
                    </Link>
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {t("settings")}
                    </Link>
                    {isAdmin && (
                      <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        {t("adminPanel")}
                      </Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                    >
                      {t("logout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-brand-500">
                {t("login")}
              </Link>
              <Link href="/auth/register" className="rounded-xl bg-brand-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors">
                {t("register")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile right side: messages + notifications + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          {session && (
            <Link
              href="/messages"
              aria-label={t("messages")}
              title={t("messages")}
              className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <MessageCircle className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
          {session && <NotificationBell />}
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu – rendered via portal so backdrop-filter on header doesn't trap it */}
      {mobileOpen && createPortal(
        <div className="fixed inset-x-0 bottom-0 z-[9999] md:hidden" style={{ top: "64px" }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute right-0 top-0 flex h-full w-4/5 max-w-sm flex-col bg-white shadow-xl">

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <nav className="flex flex-col gap-0.5">
                {PRIMARY_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                    {l.label}
                  </Link>
                ))}

                <hr className="my-3 border-gray-100" />
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">{t("more")}</p>
                {SECONDARY_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 active:bg-gray-100">
                    {l.label}
                  </Link>
                ))}

                {/* Language switcher */}
                <hr className="my-3 border-gray-100" />
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-600">{t("language")}</p>
                <div className="flex flex-wrap gap-2 px-3 pb-1">
                  {routing.locales.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => { switchLocale(loc); setMobileOpen(false); }}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        loc === locale
                          ? "bg-brand-700 text-white"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {LOCALE_LABELS[loc].label}
                    </button>
                  ))}
                </div>

                {/* Auth section */}
                <hr className="my-3 border-gray-100" />
                {session ? (
                  <>
                    {/* User info */}
                    <div className="px-3 pb-3">
                      <p className="font-semibold text-sm text-gray-800">{session.user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                      {roleInfo && (
                        <span className={cn("mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", roleInfo.color)}>
                          {roleInfo.label}
                        </span>
                      )}
                    </div>

                    <Link href="/profile" onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      {t("profile")}
                    </Link>
                    <Link href="/settings" onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      {t("settings")}
                    </Link>
                    {isAdmin && (
                      <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                        {t("adminPanel")}
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100">
                      {t("login")}
                    </Link>
                    <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                      className="mt-1 rounded-xl bg-brand-700 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-800 active:bg-brand-900">
                      {t("register")}
                    </Link>
                  </>
                )}
              </nav>
            </div>

            {/* Logout pinned at bottom */}
            {session && (
              <div className="border-t border-gray-100 px-4 py-4">
                <button
                  onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
                  className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
