import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Üres listaoldal ne kerüljön a sitemapbe.
 *
 * A HIBA, AMIT EZ VÉD: élesben 0 örökbefogadható állat és 0 közelgő esemény
 * volt, a sitemap mégis felsorolta az /animals és /events oldalt mind a négy
 * nyelven. A Google az üres „nincs találat” listákat nem indexelte
 * („Feltérképezve – jelenleg nincs indexelve”, lágy 404).
 */

let counts = { animals: 0, events: 0 };

vi.mock("@/lib/prisma", () => ({
  prisma: {
    animal:  { count: async () => counts.animals, findMany: async () => [] },
    event:   { count: async () => counts.events,  findMany: async () => [] },
    shelter: { findMany: async () => [] },
    post:    { findMany: async () => [] },
  },
}));

const { default: sitemap } = await import("@/app/sitemap");
const paths = async () => (await sitemap()).map((e) => new URL(e.url).pathname);

beforeEach(() => { counts = { animals: 0, events: 0 }; });

describe("sitemap és üres listák", () => {
  it("0 állatnál és 0 eseménynél kihagyja a listaoldalakat, minden nyelven", async () => {
    const p = await paths();
    expect(p.some((x) => x.endsWith("/animals"))).toBe(false);
    expect(p.some((x) => x.endsWith("/events"))).toBe(false);
    expect(p).toContain("/shelters");
  });

  it("ha van tartalom, a listaoldalak mind a négy nyelven visszakerülnek", async () => {
    counts = { animals: 3, events: 1 };
    const p = await paths();
    for (const prefix of ["", "/en", "/de", "/pl"]) {
      expect(p).toContain(`${prefix}/animals`);
      expect(p).toContain(`${prefix}/events`);
    }
  });
});
