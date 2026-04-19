"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, PawPrint, MessageCircle, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, { label: string; flag: string }> = {
  hu: { label: "Magyar",  flag: "🇭🇺" },
  en: { label: "English", flag: "🇬🇧" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  pl: { label: "Polski",  flag: "🇵🇱" },
};

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  SUPER_ADMIN:   { label: "Főadmin",       color: "bg-red-100 text-red-700" },
  SHELTER_ADMIN: { label: "Menhely admin", color: "bg-brand-100 text-brand-700" },
  USER:          { label: "Felhasználó",   color: "bg-gray-100 text-gray-600" },
};

export function Header() {
  const t = useTranslations("nav");
  const locale  = useLocale();
  const pathname = usePathname();
  const router  = useRouter();

  const { data: session } = useSession();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [unread,       setUnread]       = useState(0);

  const NAV_LINKS = [
    { href: "/animals",  label: t("animals")  },
    { href: "/shelters", label: t("shelters") },
    { href: "/reports",  label: t("reports")  },
    { href: "/donate",   label: t("donate")   },
  ];

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetch_ = () =>
      fetch("/api/messages/unread")
        .then((r) => r.json())
        .then((d) => setUnread(d.count ?? 0))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, [session?.user?.id]);

  function switchLocale(newLocale: string) {
    setLangMenuOpen(false);
    // Remove current locale prefix from pathname
    const locales = routing.locales as readonly string[];
    const segments = pathname.split("/");
    const hasLocalePrefix = locales.includes(segments[1]);
    const pathWithoutLocale = hasLocalePrefix ? "/" + segments.slice(2).join("/") : pathname;
    const cleanPath = pathWithoutLocale || "/";

    if (newLocale === routing.defaultLocale) {
      router.push(cleanPath);
    } else {
      router.push(`/${newLocale}${cleanPath}`);
    }
  }

  const isAdmin =
    session?.user?.role === "SHELTER_ADMIN" ||
    session?.user?.role === "SUPER_ADMIN";

  const roleInfo = session?.user?.role
    ? (ROLE_LABELS[session.user.role] ?? ROLE_LABELS.USER)
    : null;

  const currentLocale = LOCALE_LABELS[locale] ?? LOCALE_LABELS.hu;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-500">
          <PawPrint className="h-6 w-6" />
          <span className="text-lg">ÁllatiMenhelyek</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-500"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>{currentLocale.flag} {currentLocale.label}</span>
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg z-50">
                {routing.locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50",
                      loc === locale ? "font-semibold text-brand-600" : "text-gray-700"
                    )}
                  >
                    {LOCALE_LABELS[loc].flag} {LOCALE_LABELS[loc].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {session ? (
            <>
              {/* Messages */}
              <Link
                href="/messages"
                className="relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-brand-500 transition-colors"
              >
                <span className="relative">
                  <MessageCircle className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline">{t("messages")}</span>
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
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg z-50">
                    <div className="px-4 pb-2 pt-2">
                      <p className="truncate text-sm font-semibold text-gray-800">{session.user?.name}</p>
                      <p className="truncate text-xs text-gray-400">{session.user?.email}</p>
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
                    <Link href="/messages" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {t("myMessages")}
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
              <Link href="/auth/register" className="rounded-xl bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
                {t("register")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                {l.label}
              </Link>
            ))}

            {/* Language switcher mobile */}
            <hr className="my-2 border-gray-100" />
            <div className="px-3 py-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Nyelv / Language</p>
              <div className="flex flex-wrap gap-2">
                {routing.locales.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => { switchLocale(loc); setMobileOpen(false); }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      loc === locale
                        ? "bg-brand-500 text-white"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    {LOCALE_LABELS[loc].flag} {LOCALE_LABELS[loc].label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="my-2 border-gray-100" />
            {session ? (
              <>
                {roleInfo && (
                  <div className="px-3 pb-1">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", roleInfo.color)}>
                      {roleInfo.label}
                    </span>
                  </div>
                )}
                <Link href="/profile" onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {t("profile")}
                </Link>
                <Link href="/messages" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <MessageCircle className="h-4 w-4" />
                  {t("myMessages")}
                  {unread > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
                {isAdmin && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {t("adminPanel")}
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                >
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {t("login")}
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-brand-500 px-3 py-2 text-center text-sm font-medium text-white">
                  {t("register")}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
