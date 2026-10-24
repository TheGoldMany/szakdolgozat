import { describe, it, expect, vi, afterEach } from "vitest";
import { geocodeAddress, streetVariants } from "@/lib/geo";

/**
 * Geokódolás: ha az utca nincs meg az OpenStreetMapben, a település még igen.
 *
 * A HIBA, AMIT EZ VÉD: a „Bene szél utca, Lajosmizse" bejelentés koordináta
 * nélkül maradt, mert a cím nem volt meg, a település-tartalék pedig csak egy
 * beégetett nagyváros-listát nézett. Lajosmizse nincs rajta.
 */

afterEach(() => vi.unstubAllGlobals());

describe("geocodeAddress", () => {
  it("ha a cím nem található, a településre esik vissza", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(decodeURIComponent(url));
      const cityOnly = url.includes("q=") && !decodeURIComponent(url).includes("Bene");
      return new Response(JSON.stringify(cityOnly ? [{ lat: "47.02", lon: "19.56" }] : []), { status: 200 });
    });

    const hit = await geocodeAddress({ city: "Lajosmizse", address: "Bene szél utca" });

    expect(hit).toEqual({ lat: 47.02, lng: 19.56 });
    expect(urls.at(-1)).toContain("q=Lajosmizse, Hungary");
  });

  it("ha a település sem található és nincs a listán, null", async () => {
    vi.stubGlobal("fetch", async () => new Response("[]", { status: 200 }));
    expect(await geocodeAddress({ city: "Nemlétezőfalva", address: "Fő utca 1" })).toBeNull();
  });
});

describe("streetVariants", () => {
  it("a többszavas utcanevet egybeírva és kötőjellel is kipróbálja", () => {
    expect(streetVariants("Bene szél utca")).toEqual(["Beneszél utca", "Bene-szél utca"]);
    expect(streetVariants("Kis rét dűlő 3")).toEqual(["Kisrét dűlő 3", "Kis-rét dűlő 3"]);
  });

  it("egyszavas utcanévnél nincs változat", () => {
    expect(streetVariants("Fő utca 1")).toEqual([]);
  });

  it("a „Bene szél utca, Lajosmizse” címet az egybeírt változattal találja meg", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      const hit = decodeURIComponent(url).includes("Beneszél utca");
      return new Response(JSON.stringify(hit ? [{ lat: "47.016", lon: "19.556" }] : []), { status: 200 });
    });
    expect(await geocodeAddress({ city: "Lajosmizse", address: "Bene szél utca" })).toEqual({ lat: 47.016, lng: 19.556 });
  });
});
