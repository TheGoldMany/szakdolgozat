import { describe, it, expect, beforeAll } from "vitest";

/**
 * Kanonikus cím, hreflang és strukturált adat.
 *
 * Amit védeni kell:
 *
 * • A NYELVI ELŐTAG SZABÁLYA. A `localePrefix: "as-needed"` miatt a magyar
 *   változat előtag NÉLKÜL él. Egy `/hu/animals` alakú kanonikus cím
 *   átirányításra mutatna, és az átirányított címet a Google nem fogadja el
 *   kanonikusnak — vagyis az oldal kieshetne az indexből.
 * • A HREFLANG TELJESSÉGE. Ha egy nyelv kimarad, a Google a maradékot
 *   duplikátumnak nézheti. Az `x-default` hiánya pedig azt jelenti, hogy a
 *   nem felsorolt nyelvű keresőnek maga választ — nem feltétlenül jól.
 * • A STRUKTURÁLT ADAT NE TALÁLJON KI SEMMIT. Ami hiányzik az adatbázisból,
 *   az maradjon ki a JSON-LD-ből is: a kitalált vagy üres mező a Search
 *   Consoleban hibaként jelenik meg, nem előnyként.
 */

const SITE = "https://www.allatimenhelyek.hu";

let localeUrl: typeof import("@/lib/page-metadata").localeUrl;
let alternates: typeof import("@/lib/page-metadata").alternates;
let pageMetadata: typeof import("@/lib/page-metadata").pageMetadata;
let shelterJsonLd: typeof import("@/lib/structured-data").shelterJsonLd;
let websiteJsonLd: typeof import("@/lib/structured-data").websiteJsonLd;
let breadcrumbJsonLd: typeof import("@/lib/structured-data").breadcrumbJsonLd;

beforeAll(async () => {
  // A modulok betöltéskor olvassák a `siteUrl()`-t, ezért az import ELŐTT kell.
  process.env.NEXT_PUBLIC_APP_URL = SITE;
  ({ localeUrl, alternates, pageMetadata } = await import("@/lib/page-metadata"));
  ({ shelterJsonLd, websiteJsonLd, breadcrumbJsonLd } = await import("@/lib/structured-data"));
});

describe("nyelvi URL-ek", () => {
  it("a magyar változat ELŐTAG NÉLKÜL él", () => {
    expect(localeUrl("hu", "/animals")).toBe(`${SITE}/animals`);
  });

  it("a többi nyelv előtaggal", () => {
    expect(localeUrl("en", "/animals")).toBe(`${SITE}/en/animals`);
    expect(localeUrl("de", "/animals")).toBe(`${SITE}/de/animals`);
    expect(localeUrl("pl", "/animals")).toBe(`${SITE}/pl/animals`);
  });

  it("a kezdőlapon nem marad záró perjel", () => {
    // A `${SITE}/` és a `${SITE}` külön URL-nek számít; a perjeles alak
    // átirányít, és átirányított cím nem lehet kanonikus.
    expect(localeUrl("hu", "/")).toBe(SITE);
    expect(localeUrl("en", "/")).toBe(`${SITE}/en`);
  });
});

describe("hreflang", () => {
  it("mind a négy nyelv szerepel, plusz az x-default", () => {
    const alts = alternates("en", "/shelters") as {
      canonical: string; languages: Record<string, string>;
    };

    expect(Object.keys(alts.languages).sort()).toEqual(
      ["de", "en", "hu", "pl", "x-default"]
    );
  });

  it("az x-default a magyar változatra mutat", () => {
    const alts = alternates("pl", "/map") as { languages: Record<string, string> };
    expect(alts.languages["x-default"]).toBe(`${SITE}/map`);
  });

  it("a kanonikus cím az AKTUÁLIS nyelvé, nem mindig a magyaré", () => {
    const alts = alternates("de", "/reports") as { canonical: string };
    expect(alts.canonical).toBe(`${SITE}/de/reports`);
  });
});

describe("oldal-metaadat", () => {
  it("kanonikus címet, OG-t és Twitter-kártyát is ad", () => {
    const meta = pageMetadata({
      locale: "hu", path: "/animals",
      title: "Örökbefogadható állatok", description: "Leírás",
    });

    expect((meta.alternates as { canonical: string }).canonical).toBe(`${SITE}/animals`);
    expect(meta.openGraph?.url).toBe(`${SITE}/animals`);
    expect((meta.twitter as { card: string }).card).toBe("summary_large_image");
  });

  it("a noIndex csak akkor kerül bele, ha kérik", () => {
    expect(pageMetadata({ locale: "hu", path: "/x", title: "T", description: "D" }).robots)
      .toBeUndefined();
    expect(pageMetadata({ locale: "hu", path: "/x", title: "T", description: "D", noIndex: true }).robots)
      .toEqual({ index: false, follow: true });
  });
});

describe("strukturált adat", () => {
  it("a kereső saját keresődobozt kaphat a kezdőlaphoz", () => {
    const graph = websiteJsonLd("hu")["@graph"] as Array<Record<string, unknown>>;
    const site  = graph.find((n) => n["@type"] === "WebSite")!;
    const action = site.potentialAction as { target: { urlTemplate: string } };

    expect(action.target.urlTemplate).toContain("search_term_string");
    // A cím tényleges keresőoldalra kell hogy mutasson, különben a Google
    // elutasítja a jelölést.
    expect(action.target.urlTemplate).toContain("/animals?q=");
  });

  it("a menhely AnimalShelter típusú, nem általános szervezet", () => {
    const data = shelterJsonLd(
      { name: "Tappancs", slug: "tappancs", city: "Szeged" }, "hu"
    ) as Record<string, unknown>;
    expect(data["@type"]).toBe("AnimalShelter");
  });

  it("a hiányzó mezők KIMARADNAK, nem üresen kerülnek bele", () => {
    const data = shelterJsonLd(
      { name: "Tappancs", slug: "tappancs", city: "Szeged",
        address: null, phone: null, website: null, lat: null, lng: null },
      "hu"
    ) as Record<string, unknown>;

    for (const key of ["telephone", "sameAs", "geo", "image", "description"]) {
      expect({ key, present: key in data }).toEqual({ key, present: false });
    }
    expect(data.name).toBe("Tappancs");
  });

  it("fél koordinátát NEM ad meg", () => {
    // Szélesség hosszúság nélkül a térképen az Atlanti-óceánra tenné a menhelyet.
    const data = shelterJsonLd(
      { name: "T", slug: "t", city: "Szeged", lat: 46.25, lng: null }, "hu"
    ) as Record<string, unknown>;
    expect("geo" in data).toBe(false);
  });

  it("teljes koordinátát megad", () => {
    const data = shelterJsonLd(
      { name: "T", slug: "t", city: "Szeged", lat: 46.25, lng: 20.14 }, "hu"
    ) as Record<string, unknown>;
    expect(data.geo).toEqual({ "@type": "GeoCoordinates", latitude: 46.25, longitude: 20.14 });
  });

  it("a morzsasor a nyelvnek megfelelő URL-eket használja", () => {
    const data = breadcrumbJsonLd(
      [{ name: "Menhelyek", path: "/shelters" }, { name: "Tappancs", path: "/shelters/tappancs" }],
      "de"
    );
    const items = data.itemListElement as Array<{ position: number; item: string }>;

    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1].item).toBe(`${SITE}/de/shelters/tappancs`);
  });
});
