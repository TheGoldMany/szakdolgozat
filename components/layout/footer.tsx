"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Mail, Heart } from "lucide-react";
import { useTranslations } from "next-intl";

export function Footer() {
  const t    = useTranslations("footer");
  const tNav = useTranslations("nav");

  // A lábléc a teljes nyilvános felületet listázza – a kereső innen is
  // felderíti az aloldalakat, és a látogatónak sem tűnik el semmi.
  const NAV = [
    { label: tNav("animals"),  href: "/animals"  },
    { label: tNav("shelters"), href: "/shelters" },
    { label: tNav("map"),      href: "/map"      },
    { label: tNav("reports"),  href: "/reports"  },
    { label: tNav("donate"),   href: "/donate"   },
    { label: tNav("events"),   href: "/events"   },
    { label: tNav("articles"), href: "/articles" },
  ];

  // A horgonyok a súgó tényleges szakasz-azonosítóira mutatnak (u- előtag),
  // korábban olyan id-kre hivatkoztak, amik nem léteznek.
  const HELP = [
    { label: t("guide"),           href: "/sugo"                 },
    { label: t("adoptionProcess"), href: "/sugo#u-orokbefogadas" },
    { label: t("donating"),        href: "/sugo#u-adomanyozas"   },
    { label: t("reporting"),       href: "/sugo#u-bejelentes"    },
    { label: t("map"),             href: "/sugo#u-terkep"        },
    { label: t("contact"),         href: "/kapcsolat"            },
  ];

  const LEGAL = [
    { label: t("privacy"), href: "/adatvedelem"       },
    { label: t("terms"),   href: "/aszf"               },
    { label: t("cookies"), href: "/adatvedelem#cookie" },
  ];

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="ÁllatiMenhelyek.hu">
              <Image
                src="/logo-mark.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0"
              />
              <Image
                src="/logo-wordmark.png"
                alt="ÁllatiMenhelyek.hu"
                width={509}
                height={43}
                className="h-[17px] w-auto"
              />
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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
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
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t("forShelters")}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/auth/login" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {tNav("login")}
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register/shelter" className="text-sm text-gray-600 hover:text-brand-600 transition-colors">
                    {t("registerShelter")}
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
        <div className="mt-10 border-t border-gray-200 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} ÁllatiMenhelyek.hu – {t("copyright")}
          </p>
          <p className="flex items-center gap-1 text-xs text-gray-500">
            Készült <Heart className="h-3 w-3 text-brand-500" /> {t("madeWith")}
          </p>
        </div>

      </div>
    </footer>
  );
}
