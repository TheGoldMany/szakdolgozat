import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales:       ["hu", "en", "de", "pl"],
  defaultLocale: "hu",
  localePrefix:  "as-needed",
});
