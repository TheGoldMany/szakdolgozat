import { describe, it, expect } from "vitest";
import {
  analyseSeo, effectiveTitle, effectiveDescription, tagSlug, cleanTermList,
  SEO_DESC_MAX,
} from "@/lib/seo";

const base = {
  title:   "Így fogadj örökbe kutyát felelősen",
  content: "Az örökbefogadás nagy felelősség. ".repeat(30),
};

function statusOf(checks: ReturnType<typeof analyseSeo>, id: string) {
  return checks.find((c) => c.id === id)?.status;
}

describe("effectiveTitle", () => {
  it("a keresőcím felülírja a cikk címét", () => {
    expect(effectiveTitle({ title: "Cikk cím", seoTitle: "Keresőcím" })).toBe("Keresőcím");
  });

  it("üres keresőcímnél a cikk címe marad", () => {
    expect(effectiveTitle({ title: "Cikk cím", seoTitle: "   " })).toBe("Cikk cím");
    expect(effectiveTitle({ title: "Cikk cím", seoTitle: null })).toBe("Cikk cím");
  });
});

describe("effectiveDescription", () => {
  it("a megadott meta leírás nyer", () => {
    const d = effectiveDescription({ metaDescription: "Meta", excerpt: "Bevezető", content: "Szöveg" });
    expect(d).toBe("Meta");
  });

  it("meta hiányában a bevezető a tartalék", () => {
    const d = effectiveDescription({ metaDescription: null, excerpt: "Bevezető", content: "Szöveg" });
    expect(d).toBe("Bevezető");
  });

  it("mindkettő hiányában a szöveg elejét vágja le", () => {
    const long = "szó ".repeat(200);
    const d = effectiveDescription({ metaDescription: null, excerpt: null, content: long });
    expect(d.length).toBeLessThanOrEqual(SEO_DESC_MAX);
    expect(d.endsWith("…")).toBe(true);
  });
});

describe("analyseSeo", () => {
  it("a kulcsszót ékezettől és kisbetűtől függetlenül találja meg", () => {
    const checks = analyseSeo({
      ...base,
      focusKeyword: "ÖRÖKBEFOGADÁS",
      metaDescription: "Az orokbefogadas menete lépésről lépésre, hogy jól dönts.",
    });
    // a címben „örökbefogadj” szerepel, a leírásban ékezet nélkül
    expect(statusOf(checks, "kw-desc")).toBe("ok");
  });

  it("jelzi, ha a kulcsszó nincs benne a címben", () => {
    const checks = analyseSeo({ ...base, focusKeyword: "macska oltás" });
    expect(statusOf(checks, "kw-title")).toBe("warn");
  });

  it("jelzi, ha a kulcsszó csak a szöveg végén van", () => {
    const checks = analyseSeo({
      title:   "Cím",
      content: `${"töltelék ".repeat(200)} chipes regisztráció`,
      focusKeyword: "chipes regisztráció",
    });
    expect(statusOf(checks, "kw-intro")).toBe("warn");
  });

  it("a túl hosszú címet jelzi", () => {
    const checks = analyseSeo({ ...base, seoTitle: "x".repeat(80) });
    expect(statusOf(checks, "title")).toBe("warn");
  });

  it("hiányzó leírásnál hibát ad, nem figyelmeztetést", () => {
    const checks = analyseSeo({ title: "Cím", content: "" });
    expect(statusOf(checks, "desc")).toBe("bad");
  });

  it("a rövid szöveget jelzi", () => {
    const checks = analyseSeo({ title: "Cím", content: "Két szó" });
    expect(statusOf(checks, "length")).toBe("warn");
  });

  it("kifogástalan cikknél nincs teendő", () => {
    const checks = analyseSeo({
      title:   "Kutya örökbefogadás: amit tudnod kell",
      seoTitle: "Kutya örökbefogadás lépésről lépésre",
      metaDescription:
        "A kutya örökbefogadás menete a menhely felkeresésétől a hazavitelig, " +
        "gyakorlati tanácsokkal, hogy a döntés mindkettőtöknek jó legyen.",
      // 300 szó fölött, hogy a hossz-ellenőrzés is „ok” legyen
      content: "A kutya örökbefogadás felelősség. ".repeat(80),
      focusKeyword: "kutya örökbefogadás",
      slug:     "kutya-orokbefogadas-lepesrol-lepesre",
      imageUrl: "https://example.com/kep.jpg",
      tags:     ["örökbefogadás"],
    });
    expect(checks.every((c) => c.status === "ok")).toBe(true);
  });
});

describe("tagSlug", () => {
  it("ékezet nélküli, URL-barát alakot ad", () => {
    expect(tagSlug("Örökbefogadás")).toBe("orokbefogadas");
    expect(tagSlug("Kutya & macska")).toBe("kutya-macska");
    expect(tagSlug("  Téli   felkészülés  ")).toBe("teli-felkeszules");
  });

  it("a különböző írásmódú, de azonos címszó ugyanoda mutat", () => {
    expect(tagSlug("EGÉSZSÉG")).toBe(tagSlug("egészség"));
  });
});

describe("cleanTermList", () => {
  it("kiszedi az üreseket és a duplikátumokat", () => {
    expect(cleanTermList(["kutya", " kutya ", "", "  ", "macska"])).toEqual(["kutya", "macska"]);
  });

  it("az ékezetes duplikátumot is felismeri", () => {
    expect(cleanTermList(["Egészség", "egeszseg"])).toEqual(["Egészség"]);
  });

  it("a nem szöveges elemeket kihagyja", () => {
    expect(cleanTermList(["ok", 42, null, { a: 1 }])).toEqual(["ok"]);
  });

  it("nem tömb bemenetre üres listát ad", () => {
    expect(cleanTermList("nem tömb")).toEqual([]);
    expect(cleanTermList(undefined)).toEqual([]);
  });

  it("betartja a maximumot", () => {
    const many = Array.from({ length: 50 }, (_, i) => `kulcs-${i}`);
    expect(cleanTermList(many, 20)).toHaveLength(20);
  });
});
