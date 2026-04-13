"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, PawPrint, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/animals",  label: "Állatok" },
  { href: "/shelters", label: "Menhelyek" },
];

export function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin =
    session?.user?.role === "SHELTER_ADMIN" ||
    session?.user?.role === "SUPER_ADMIN";

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

        {/* Auth – desktop */}
        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span className="max-w-[120px] truncate">{session.user?.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profilom
                  </Link>
                  <Link
                    href="/applications"
                    onClick={() => setUserMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Kérelmeim
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Admin felület
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                  >
                    Kijelentkezés
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-brand-500"
              >
                Bejelentkezés
              </Link>
              <Link
                href="/auth/register"
                className="rounded-xl bg-brand-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
              >
                Regisztráció
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
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {l.label}
              </Link>
            ))}
            <hr className="my-2 border-gray-100" />
            {session ? (
              <>
                <Link href="/profile" onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Profilom
                </Link>
                {isAdmin && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Admin felület
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                >
                  Kijelentkezés
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Bejelentkezés
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-brand-500 px-3 py-2 text-center text-sm font-medium text-white">
                  Regisztráció
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
