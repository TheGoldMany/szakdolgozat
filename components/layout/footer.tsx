"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Mail, Heart, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { paymentsEnabled } from "@/lib/payments-enabled";
import { FeedbackDialog } from "@/components/layout/feedback-dialog";

export function Footer() {
  const t    = useTranslations("footer");
  const tNav = useTranslations("nav");

  // Fizetés kikapcsolva: az adományozáshoz kötődő hivatkozások kimaradnak.
  // A szűrés a lista ÖSSZEÁLLÍTÁSÁNÁL történik, nem a rendereléskor, hogy
  // kikapcsolt állapotban ne maradjon utánuk üres hely vagy elválasztó.
  const payments = paymentsEnabled();

  // A lábléc a teljes nyilvános felületet listázza – a kereső innen is
  // felderíti az aloldalakat, és a látogatónak sem tűnik el semmi.
  const NAV = [
    { label: tNav("animals"),  href: "/animals"  },
    { label: tNav("shelters"), href: "/shelters" },
    { label: tNav("map"),      href: "/map"      },
    { label: tNav("reports"),  href: "/reports"  },
    { label: tNav("events"),   href: "/events"   },
    { label: tNav("articles"), href: "/articles" },
    ...(payments ? [{ label: tNav("donate"), href: "/donate" }] : []),
  ];

  // A horgonyok a súgó tényleges szakasz-azonosítóira mutatnak (u- előtag),
  // korábban olyan id-kre hivatkoztak, amik nem léteznek.
  const HELP = [
    { label: t("guide"),           href: "/sugo"                 },
    { label: t("adoptionProcess"), href: "/sugo#u-orokbefogadas" },
    { label: t("reporting"),       href: "/sugo#u-bejelentes"    },
    { label: t("map"),             href: "/sugo#u-terkep"        },
    { label: t("contact"),         href: "/kapcsolat"            },
    ...(payments ? [
      { label: t("donating"),    href: "/sugo#u-adomanyozas" },
      { label: t("platformFee"), href: "/platformdij"        },
    ] : []),
  ];

  const LEGAL = [
    { label: t("privacy"), href: "/adatvedelem"       },
    { label: t("terms"),   href: "/aszf"               },
    { label: t("cookies"), href: "/adatvedelem#cookie" },
  ];

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 lg:px-8 2xl:px-12">

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
              <li><FeedbackDialog /></li>
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

        {/* Mik NEM vagyunk: a bejelentők gyakran hatóságnak vagy sintértelepnek
            hiszik az oldalt, és arra várnak, hogy valaki kimegy az állatért. */}
        <p className="mt-10 flex gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          {t("disclaimer")}
        </p>

        {/* Bottom bar */}
        <div className="mt-6 border-t border-gray-200 pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} ÁllatiMenhelyek.hu – {t("copyright")}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-xs text-gray-500">
            {t("made")} <Heart className="h-3 w-3 text-brand-500" /> {t("madeWith")}
            <span aria-hidden className="mx-1.5 text-gray-300">·</span>
            {t("madeBy")}{" "}
            <a href="https://www.lundasoftware.hu" target="_blank" rel="noopener"
              className="font-semibold text-gray-700 underline-offset-2 hover:text-brand-700 hover:underline">
              Lunda Software
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
}
