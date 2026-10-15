import { Bricolage_Grotesque, Figtree } from "next/font/google";

/**
 * Az oldal két betűtípusa — egy helyen, mert a publikus és a dashboard
 * layout is betölti.
 *
 * MIÉRT NEM INTER: az Inter a sablonos, „bármelyik SaaS-oldal" hatás első
 * számú jele. Ráadásul eddig csak a `latin` alkészlettel töltődött be, amiben
 * NINCS `ő` és `ű` (Latin Extended-A): a böngésző ezeket betűnként egy
 * tartalék fontból rajzolta ki, vagyis minden magyar szövegben két betű
 * más betűtípussal jelent meg. A lengyel `ą ę ł ż` ugyanígy.
 *
 *  • Címsor — Bricolage Grotesque: enyhén szabálytalan, meleg groteszk. Egy
 *    állatmenhelyes oldalhoz illik a karakter; a hideg geometrikus fontok nem.
 *    Az `opsz` tengely nagy méretben szorosabbra, kicsiben nyitottabbra rajzol.
 *  • Szöveg — Figtree: barátságos, jól olvasható kis méretben is, és jól
 *    illeszkedik a címsorhoz anélkül, hogy versengene vele.
 */
export const fontBody = Figtree({
  subsets:  ["latin", "latin-ext"],
  variable: "--font-body",
  display:  "swap",
});

export const fontDisplay = Bricolage_Grotesque({
  subsets:  ["latin", "latin-ext"],
  variable: "--font-display",
  axes:     ["opsz"],
  display:  "swap",
});

/** A `<html>` elemre kerülő osztályok. */
export const fontVariables = `${fontBody.variable} ${fontDisplay.variable}`;
