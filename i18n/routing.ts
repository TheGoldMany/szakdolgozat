import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales:         ["hu", "en", "de", "pl"],
  defaultLocale:   "hu",
  localePrefix:    "as-needed",
  localeDetection: false,
  // Alapból munkamenet-süti: a böngésző bezárásával a választott nyelv
  // elveszett (a vezérlőpult is ebből olvassa). Egy évig megmarad.
  localeCookie:    { maxAge: 60 * 60 * 24 * 365 },
});
