import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";

/**
 * Kanonikus URL, hreflang és közösségi kártya egy helyen.
 *
 * MIÉRT KELL A HREFLANG
 *
 * Az oldal négy nyelven megy, és a négy változat nagyrészt ugyanazt a
 * tartalmat mutatja. Hreflang nélkül a Google ezt DUPLIKÁTUMNAK látja: kiválaszt
 * egyet, a többit pedig nem indexeli — vagy rosszabb: a magyar keresőnek az
 * angol változatot adja. A hreflang mondja meg neki, hogy ezek ugyanannak az
 * oldalnak a nyelvi változatai, és melyik kinek szól.
 *
 * MIÉRT KELL A KANONIKUS URL
 *
 * Ugyanaz az oldal elérhető `?utm_source=…` paraméterekkel, a `www` és a
 * `www` nélküli néven, és a listák lapozó paramétereivel. Kanonikus megjelölés
 * nélkül ezek külön oldalaknak számítanak, és egymástól veszik el az erőt.
 *
 * A PREFIX-SZABÁLY: a `localePrefix: "as-needed"` miatt a magyar változat
 * előtag NÉLKÜL él (`/animals`), a többi előtaggal (`/en/animals`). Ezt itt
 * egy helyen kezeljük — kézzel összerakva előbb-utóbb valaki `/hu/animals`-t
 * írna, ami átirányít, és az átirányított cím kanonikusként hibát ér.
 */

const BASE = siteUrl();

/** Egy útvonal teljes URL-je az adott nyelven. A `path` előtag nélküli: `/animals`. */
export function localeUrl(locale: string, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === routing.defaultLocale
    ? `${BASE}${clean}`
    : `${BASE}/${locale}${clean}`;
}

/**
 * A kanonikus cím és a nyelvi változatok.
 *
 * Az `x-default` a magyar: ez megy annak a keresőnek, akinek a nyelve egyik
 * felsorolttal sem egyezik. Elhagyva a Google maga választana, és a választása
 * nem feltétlenül az, amit szeretnénk.
 */
export function alternates(locale: string, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localeUrl(l, path);
  languages["x-default"] = localeUrl(routing.defaultLocale, path);

  return { canonical: localeUrl(locale, path), languages };
}

/** A next-intl nyelvkódjai OpenGraph alakban (`hu_HU`). */
const OG_LOCALE: Record<string, string> = {
  hu: "hu_HU", en: "en_GB", de: "de_DE", pl: "pl_PL",
};

export interface PageMetaInput {
  locale:      string;
  /** Nyelvi előtag NÉLKÜLI útvonal, pl. `/animals` vagy `/animals/bodri`. */
  path:        string;
  title:       string;
  description: string;
  /** Teljes URL. Hiányában a route-szintű `opengraph-image` lép életbe. */
  image?:      string | null;
  /** Cikkeknél `article`, egyébként `website`. */
  type?:       "website" | "article";
  /** Igaz, ha az oldalt NEM szabad indexelni (pl. szűrt lista-nézet). */
  noIndex?:    boolean;
}

/**
 * Egy publikus oldal teljes keresőoldali leírása.
 *
 * Minden publikus oldal ezt használja, hogy ne fordulhasson elő, ami eddig: a
 * cikkeken volt kanonikus cím, máshol nem, és hreflang sehol.
 */
export function pageMetadata(input: PageMetaInput): Metadata {
  const { locale, path, title, description, image, type = "website", noIndex } = input;
  const url = localeUrl(locale, path);

  return {
    title,
    description,
    alternates: alternates(locale, path),
    ...(noIndex && { robots: { index: false, follow: true } }),
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: "ÁllatiMenhelyek.hu",
      locale:   OG_LOCALE[locale] ?? "hu_HU",
      // A többi nyelv is felsorolva: a megosztott hivatkozás így a megfelelő
      // változatot tudja felkínálni.
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l])
        .filter(Boolean),
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  };
}
