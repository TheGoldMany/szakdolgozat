import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { safeHref, safeHttpUrl } from "@/lib/safe-url";

/**
 * Kattintható külső link: csak http(s).
 *
 * A `z.string().url()` elfogadja a `javascript:alert(1)`-et, a React 18 pedig
 * egy ilyen `href`-et kattintáskor lefuttat — a mi domainünkön.
 */
describe("safeHref", () => {
  it("a http és https címet átengedi", () => {
    expect(safeHref("https://vet.hu/")).toBe("https://vet.hu/");
    expect(safeHref("http://vet.hu")).toBe("http://vet.hu/");
  });

  it("a javascript: és társai nem jutnak át", () => {
    for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)",
                       "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)"]) {
      expect({ bad, out: safeHref(bad) }).toEqual({ bad, out: undefined });
    }
  });

  it("üres és értelmezhetetlen értékre undefined", () => {
    expect(safeHref(null)).toBeUndefined();
    expect(safeHref("")).toBeUndefined();
    expect(safeHref("nem url")).toBeUndefined();
  });

  it("a validáció ugyanígy dönt", () => {
    expect(safeHttpUrl.safeParse("https://vet.hu").success).toBe(true);
    expect(safeHttpUrl.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("a térkép-buborék és a nyilvános oldalak a szűrőn át linkelnek", () => {
    for (const f of ["components/ui/animal-map.tsx", "app/[locale]/shelters/[slug]/page.tsx",
                     "app/[locale]/messages/[id]/page.tsx"]) {
      expect({ f, guarded: readFileSync(f, "utf8").includes("safeHref(") }).toEqual({ f, guarded: true });
    }
  });
});
