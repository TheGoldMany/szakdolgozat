"use client";

import { Link } from "@/i18n/navigation";
import { PawPrint, Mail, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

export function Footer() {
  const t    = useTranslations("footer");
  const tNav = useTranslations("nav");

  const NAV = [
    { label: tNav("animals"),  href: "/animals"  },
    { label: tNav("shelters"), href: "/shelters"  },
    { label: tNav("reports"),  href: "/reports"   },
    { label: tNav("donate"),   href: "/donate"    },
  ];

  const HELP = [
    { label: t("guide"),           href: "/sugo"               },
    { label: t("adoptionProcess"), href: "/sugo#orokbefogadas"  },
    { label: t("donating"),        href: "/sugo#adomanyozas"   },
    { label: t("reporting"),       href: "/sugo#bejelentes"    },
    { label: t("contact"),         href: "/kapcsolat"          },
  ];

  const LEGAL = [
    { label: t("privacy"), href: "/adatvedelem"       },
    { label: t("terms"),   href: "/aszf"               },
    { label: t("cookies"), href: "/adatvedelem#cookie" },
  ];

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

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
              {t("description")}
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
              {t("page")}
            </h3>
            <ul className="space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t("help")}
            </h3>
            <ul className="space-y-2">
              {HELP.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + For shelters */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {t("legal")}
            </h3>
            <ul className="space-y-2">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t("forShelters")}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/auth/login" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {tNav("login")}
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {tNav("register")}
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {t("dashboard")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ÁllatiMenhelyek.hu – {t("copyright")}
          </p>
          <p className="flex items-center gap-1 text-xs text-gray-400">
            Készült <Heart className="h-3 w-3 text-brand-500" /> {t("madeWith")}
          </p>
        </div>

      </div>
    </footer>
  );
}
