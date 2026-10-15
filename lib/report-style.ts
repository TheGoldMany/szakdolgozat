import { Bird, Cat, Dog, PawPrint, Rabbit, Search, Home, Navigation, type LucideIcon } from "lucide-react";
import type { AnimalType, ReportType } from "@prisma/client";

/**
 * A bejelentések közös vizuális nyelve: lista, részletes oldal, űrlap és a
 * térkép ugyanazt a színt és ikont használja egy-egy típushoz, így a
 * látogató egy pillantásból tudja, elveszett, talált vagy kóbor állatról van szó.
 *
 *  • Elveszett – piros: sürgős, a gazda keres.
 *  • Talált    – márkazöld: jó hír, a gazdát keressük.
 *  • Kóbor     – borostyán: figyelmeztetés, segítség kellhet.
 */
export const REPORT_TYPE_STYLE: Record<ReportType, {
  icon:  LucideIcon;
  /** Kitöltött címke a fotó sarkában. */
  solid: string;
  /** Halvány címke világos háttéren. */
  soft:  string;
  /** Halvány háttér (fotó nélküli kártya, kiemelt doboz). */
  tint:  string;
  /** Ikon/szöveg szín a halvány háttéren. */
  ink:   string;
  /** Kijelölt állapot az űrlapon. */
  ring:  string;
  /** Kis színes pont (szűrőfül, jelmagyarázat). */
  dot:   string;
}> = {
  LOST: {
    icon:  Search,
    solid: "bg-red-600 text-white",
    soft:  "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
    tint:  "bg-red-50",
    ink:   "text-red-600",
    ring:  "has-[:checked]:border-red-500 has-[:checked]:bg-red-50",
    dot:   "bg-red-600",
  },
  FOUND: {
    icon:  Home,
    solid: "bg-brand-700 text-white",
    soft:  "bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-200",
    tint:  "bg-brand-50",
    ink:   "text-brand-700",
    ring:  "has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50",
    dot:   "bg-brand-700",
  },
  STRAY: {
    icon:  Navigation,
    solid: "bg-amber-400 text-amber-950",
    soft:  "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    tint:  "bg-amber-50",
    ink:   "text-amber-600",
    ring:  "has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50",
    dot:   "bg-amber-400",
  },
};

export const SPECIES_ICON: Record<AnimalType, LucideIcon> = {
  DOG:    Dog,
  CAT:    Cat,
  RABBIT: Rabbit,
  BIRD:   Bird,
  OTHER:  PawPrint,
};

/** „3 napja”, „2 hours ago” – a felület nyelvén, nem csak magyarul. */
export function relativeTime(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60)        return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600)      return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400)     return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}
