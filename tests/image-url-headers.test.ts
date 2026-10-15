import { describe, it, expect } from "vitest";
import { isOwnImageUrl, ownImageUrl, optionalOwnImageUrl } from "@/lib/image-url";

/**
 * Beküldött kép-URL-ek és biztonsági fejlécek.
 *
 * • KÜLSŐ KÉP NEM FOGADHATÓ EL. Tíz végpont tetszőleges URL-t elfogadott, és
 *   nyilvános oldalon jelenítette meg — egy idegen szerveren lévő „kép"
 *   minden látogató IP-címét kiszivárogtatta volna a gazdájának.
 * • A HOSZT-ELLENŐRZÉS NE LEGYEN MEGKERÜLHETŐ egy hasonló nevű domainnel
 *   (`…vercel-storage.com.tamado.hu`) vagy egy felhasználónév-trükkel
 *   (`https://…vercel-storage.com@tamado.hu/`).
 */

const OWN = "https://abc123xyz.public.blob.vercel-storage.com/kepek/bodri.jpg";

describe("saját tárhely", () => {
  it("a Vercel Blob címét elfogadja", () => {
    expect(isOwnImageUrl(OWN)).toBe(true);
  });

  it("idegen hostot elutasít", () => {
    expect(isOwnImageUrl("https://example.com/kep.jpg")).toBe(false);
    expect(isOwnImageUrl("https://i.imgur.com/kep.jpg")).toBe(false);
  });

  it("a hasonló nevű domaint nem engedi át", () => {
    expect(isOwnImageUrl("https://abc.public.blob.vercel-storage.com.tamado.hu/x.jpg")).toBe(false);
    expect(isOwnImageUrl("https://public.blob.vercel-storage.com/x.jpg")).toBe(false);
  });

  it("a felhasználónév-trükköt nem engedi át", () => {
    // Az URL-ben a @ előtti rész felhasználónév; a valódi host a tamado.hu.
    expect(isOwnImageUrl("https://abc.public.blob.vercel-storage.com@tamado.hu/x.jpg")).toBe(false);
  });

  it("sima HTTP-t és más sémát nem enged", () => {
    expect(isOwnImageUrl("http://abc.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isOwnImageUrl("javascript:alert(1)")).toBe(false);
    expect(isOwnImageUrl("data:image/png;base64,AAAA")).toBe(false);
  });

  it("az opcionális mező az üres értéket és a null-t is elfogadja", () => {
    expect(optionalOwnImageUrl.safeParse("").success).toBe(true);
    expect(optionalOwnImageUrl.safeParse(null).success).toBe(true);
    expect(optionalOwnImageUrl.safeParse(undefined).success).toBe(true);
    expect(optionalOwnImageUrl.safeParse("https://example.com/x.jpg").success).toBe(false);
  });

  it("a kötelező mező csak saját képet fogad", () => {
    expect(ownImageUrl.safeParse(OWN).success).toBe(true);
    expect(ownImageUrl.safeParse("").success).toBe(false);
  });
});

describe("next.config", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require("../next.config.js");

  it("a képoptimalizáló nem nyitott proxy", () => {
    const hosts = config.images.remotePatterns.map((p: { hostname: string }) => p.hostname);
    expect(hosts).not.toContain("**");
    expect(hosts).toContain("*.public.blob.vercel-storage.com");
  });

  it("minden válaszra kiadja a biztonsági fejléceket", async () => {
    const [rule] = await config.headers();
    const keys = rule.headers.map((h: { key: string }) => h.key);
    for (const k of ["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options",
                     "Referrer-Policy", "Permissions-Policy", "Content-Security-Policy"]) {
      expect(keys).toContain(k);
    }
    expect(rule.source).toBe("/:path*");
    expect(config.poweredByHeader).toBe(false);
  });
});
