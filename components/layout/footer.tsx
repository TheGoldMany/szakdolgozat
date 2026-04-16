import Link from "next/link";
import { PawPrint, Mail, Heart } from "lucide-react";

const NAV = [
  { label: "Állatok",      href: "/animals"  },
  { label: "Menhelyek",    href: "/shelters"  },
  { label: "Bejelentések", href: "/reports"   },
  { label: "Támogatás",    href: "/donate"    },
];

const HELP = [
  { label: "Útmutató",          href: "/sugo"              },
  { label: "Örökbefogadás menete", href: "/sugo#orokbefogadas" },
  { label: "Adományozás",       href: "/sugo#adomanyozas"  },
  { label: "Bejelentés",        href: "/sugo#bejelentes"   },
  { label: "Kapcsolat",         href: "/kapcsolat"         },
];

const LEGAL = [
  { label: "Adatvédelmi tájékoztató", href: "/adatvedelem" },
  { label: "Általános Szerződési Feltételek", href: "/aszf" },
  { label: "Cookie tájékoztató",      href: "/adatvedelem#cookie" },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Top grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <PawPrint className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-gray-900">ÁllatiMenhelyek</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Összekapcsoljuk a menhelyeket és az örökbefogadásra váró
              állatokat azokkal, akik szerető otthont tudnak adni nekik.
            </p>
            <a
              href="mailto:info@allatimenhelyek.hu"
              className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"
            >
              <Mail className="h-4 w-4" />
              info@allatimenhelyek.hu
            </a>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Oldal
            </h3>
            <ul className="space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 hover:text-brand-600 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Segítség
            </h3>
            <ul className="space-y-2">
              {HELP.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 hover:text-brand-600 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Jogi információk
            </h3>
            <ul className="space-y-2">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-600 hover:text-brand-600 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Menhelyeknek
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/auth/login" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    Bejelentkezés
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    Regisztráció
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    Admin felület
                  </Link>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ÁllatiMenhelyek.hu – Minden jog fenntartva.
          </p>
          <p className="flex items-center gap-1 text-xs text-gray-400">
            Készült <Heart className="h-3 w-3 text-brand-500" /> az állatokért
          </p>
        </div>

      </div>
    </footer>
  );
}
