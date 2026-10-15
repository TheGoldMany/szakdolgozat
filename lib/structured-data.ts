import { siteUrl } from "@/lib/site-url";
import { localeUrl } from "@/lib/page-metadata";

/**
 * Strukturált adat (JSON-LD) a keresőknek.
 *
 * MIÉRT ÉRI MEG
 *
 * A keresők a HTML-ből kitalálják, miről szól egy oldal; a JSON-LD-ből viszont
 * TUDJÁK. Ez a különbség látszik is: menhelynél cím, nyitvatartás és térképes
 * találat, a kezdőlapnál a keresődobozos megjelenés, az aloldalaknál pedig a
 * morzsasor a cím alatt a puszta URL helyett.
 *
 * MIT NEM ÍGÉR
 *
 * Az örökbefogadható állatra a Google-nek NINCS gazdag találat-típusa. Ezért az
 * állatoldalakon nem erőltetünk rá egy nem odaillő sémát (pl. `Product`):
 * az ilyen „hátha bejön" jelölés a Search Console-ban hibaként jelenik meg, és
 * semmit nem ad cserébe. Ott a morzsasor és a rendes metaadat a valódi eszköz.
 *
 * MINDEN MEZŐ VALÓS ADATBÓL JÖN. Ami hiányzik az adatbázisból, az kimarad a
 * JSON-LD-ből is — a kitalált adat (pl. odaképzelt nyitvatartás) a strukturált
 * adatnál büntetést ér, nem előnyt.
 */

const BASE = siteUrl();

/** Az üres és null mezők kiszedése, hogy ne kerüljön `null` a kimenetbe. */
function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) =>
      v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
    )
  ) as T;
}

/**
 * A szervezet és a kereshető oldal.
 *
 * A `SearchAction` az, amitől a Google a találat alatt saját keresődobozt
 * kínálhat az oldalhoz. Csak akkor működik, ha a megadott cím tényleg
 * keresőoldalra visz — ezért mutat az `/animals?q=` paraméterre, ami a
 * tényleges állatkeresés.
 */
export function websiteJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id":   `${BASE}/#organization`,
        name:    "ÁllatiMenhelyek.hu",
        url:     BASE,
        logo:    `${BASE}/logo-wordmark.png`,
        description:
          "Magyarországi állatmenhelyek örökbefogadható állatai egy helyen, " +
          "elveszett és megtalált állatok bejelentésével.",
      },
      {
        "@type":    "WebSite",
        "@id":      `${BASE}/#website`,
        url:        localeUrl(locale, "/"),
        name:       "ÁllatiMenhelyek.hu",
        publisher:  { "@id": `${BASE}/#organization` },
        inLanguage: locale,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type":     "EntryPoint",
            urlTemplate: `${localeUrl(locale, "/animals")}?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export interface ShelterForJsonLd {
  name:     string;
  slug:     string;
  city:     string;
  address?: string | null;
  zipCode?: string | null;
  phone?:   string | null;
  email?:   string | null;
  website?: string | null;
  logoUrl?: string | null;
  lat?:     number | null;
  lng?:     number | null;
  description?: string | null;
}

/**
 * Menhely mint helyi szervezet.
 *
 * Az `AnimalShelter` a schema.org SAJÁT típusa erre (a `LocalBusiness`
 * altípusa) — nem kell általánosabbal helyettesíteni. Ettől kerülhet be a
 * menhely a helyi és térképes találatok közé, ami a „menhely + város" típusú
 * keresésnél a legtöbbet érő megjelenés.
 */
export function shelterJsonLd(shelter: ShelterForJsonLd, locale: string) {
  const url = localeUrl(locale, `/shelters/${shelter.slug}`);

  return compact({
    "@context": "https://schema.org",
    "@type":    "AnimalShelter",
    "@id":      `${url}#shelter`,
    name:        shelter.name,
    url,
    description: shelter.description ?? undefined,
    image:       shelter.logoUrl ?? undefined,
    telephone:   shelter.phone ?? undefined,
    email:       shelter.email ?? undefined,
    sameAs:      shelter.website ? [shelter.website] : undefined,
    address: compact({
      "@type":          "PostalAddress",
      streetAddress:    shelter.address ?? undefined,
      addressLocality:  shelter.city,
      postalCode:       shelter.zipCode ?? undefined,
      addressCountry:   "HU",
    }),
    // Koordináta csak akkor, ha mindkettő megvan: a fél koordináta a térképen
    // az Atlanti-óceánra tenné a menhelyet.
    geo:
      typeof shelter.lat === "number" && typeof shelter.lng === "number"
        ? { "@type": "GeoCoordinates", latitude: shelter.lat, longitude: shelter.lng }
        : undefined,
  });
}

export interface Crumb { name: string; path: string }

/**
 * Morzsasor.
 *
 * A keresőtalálatban a nyers URL helyett olvasható útvonal jelenik meg
 * („Főoldal › Menhelyek › Tappancs Menhely"), és a keresőnek is megmutatja az
 * oldal szerkezetét. Ez az a strukturált adat, amiből MINDEN aloldal profitál.
 */
export function breadcrumbJsonLd(crumbs: Crumb[], locale: string) {
  return {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type":   "ListItem",
      position:  i + 1,
      name:      crumb.name,
      item:      localeUrl(locale, crumb.path),
    })),
  };
}

/**
 * Listaoldal elemei.
 *
 * Megmondja a keresőnek, hogy a lista mely aloldalakra mutat, és milyen
 * sorrendben — ettől gyorsabban és teljesebben találja meg a mélyebb
 * tartalmat, mint pusztán a hivatkozásokat követve.
 */
export function itemListJsonLd(items: { name: string; path: string }[], locale: string) {
  return {
    "@context": "https://schema.org",
    "@type":    "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type":   "ListItem",
      position:  i + 1,
      name:      item.name,
      url:       localeUrl(locale, item.path),
    })),
  };
}
