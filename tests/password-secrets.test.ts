import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  hashPassword, verifyPassword, passwordTooLong, newOneTimeToken, hashToken,
} from "@/lib/password";
import { requireSecret } from "@/lib/secrets";

/**
 * Jelszavak, egyszer használatos tokenek és kötelező titkok.
 *
 * Amit védeni kell:
 *
 * • A TOKEN HASH-E KERÜL AZ ADATBÁZISBA, nem maga a token. Egy kiszivárgott
 *   mentésből különben bárki átvehetné bármelyik fiókot, amelyhez épp függő
 *   jelszó-visszaállítás van.
 * • HIÁNYZÓ TITOKNÁL MEGÁLLUNK. A korábbi `?? "fallback"` mellett a
 *   mobil-JWT-ket egy nyilvános szóval írtuk volna alá.
 * • A FORRÁSBAN NINCS JELSZÓ. A `prisma/reset-prod.ts` korábban az éles
 *   főadmin jelszavát tartalmazta nyílt szövegben, egy publikus repóban.
 */

const ORIGINAL = process.env.NEXTAUTH_SECRET;
afterEach(() => { process.env.NEXTAUTH_SECRET = ORIGINAL; });

describe("jelszó", () => {
  it("a hash nem a jelszó, és visszaellenőrizhető", async () => {
    const h = await hashPassword("Helyes1234!");
    expect(h).not.toContain("Helyes1234!");
    expect(await verifyPassword("Helyes1234!", h)).toBe(true);
    expect(await verifyPassword("Rossz1234!", h)).toBe(false);
  });

  it("12-es bcrypt költséggel hash-el", async () => {
    // A költség a hash-ben `$2a$12$` alakban áll. Korábban hívási helyenként
    // 10 vagy 12 volt — attól függött a jelszó erőssége, hol hozták létre.
    expect(await hashPassword("Helyes1234!")).toMatch(/^\$2[aby]\$12\$/);
  });

  it("a 72 bájtnál hosszabb jelszót elutasítja, bájtban mérve", () => {
    expect(passwordTooLong("a".repeat(72))).toBe(false);
    expect(passwordTooLong("a".repeat(73))).toBe(true);
    // 40 ékezetes betű = 80 bájt: karakterben mérve átmenne, pedig a bcrypt
    // levágná a végét.
    expect(passwordTooLong("á".repeat(40))).toBe(true);
  });
});

describe("egyszer használatos token", () => {
  it("a nyers és a tárolt érték különbözik", () => {
    const { raw, hashed } = newOneTimeToken();
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).not.toBe(raw);
  });

  it("a hash determinisztikus, tehát kereshető vele", () => {
    const { raw, hashed } = newOneTimeToken();
    expect(hashToken(raw)).toBe(hashed);
  });

  it("két token soha nem egyezik", () => {
    expect(newOneTimeToken().raw).not.toBe(newOneTimeToken().raw);
  });

  it("a végpontok a HASH-t írják és keresik, nem a nyers tokent", () => {
    const forgot = readFileSync("app/api/auth/forgot-password/route.ts", "utf8");
    const reset  = readFileSync("app/api/auth/reset-password/route.ts", "utf8");
    const issue  = readFileSync("lib/verification.ts", "utf8");
    const verify = readFileSync("app/api/auth/verify-email/route.ts", "utf8");

    expect(forgot).toContain("token: hashed");
    expect(issue).toContain("token: hashed");
    expect(reset).toContain("hashToken(");
    expect(verify).toContain("hashToken(");
  });
});

describe("kötelező titok", () => {
  it("hiányzó titoknál kivételt dob, nem helyettesít", () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => requireSecret("NEXTAUTH_SECRET")).toThrow();
  });

  it("a túl rövid titkot is elutasítja", () => {
    process.env.NEXTAUTH_SECRET = "rovid";
    expect(() => requireSecret("NEXTAUTH_SECRET")).toThrow();
  });

  it("beállított titkot visszaad", () => {
    process.env.NEXTAUTH_SECRET = "x".repeat(32);
    expect(requireSecret("NEXTAUTH_SECRET")).toBe("x".repeat(32));
  });

  it("sehol nincs nyilvános alapértékű titok a forrásban", () => {
    for (const f of ["lib/mobile-auth.ts", "app/api/auth/mobile/route.ts",
                     "app/api/auth/unsubscribe/route.ts", "lib/email.ts"]) {
      const src = readFileSync(f, "utf8");
      expect({ f, fallback: /NEXTAUTH_SECRET\s*\?\?/.test(src) }).toEqual({ f, fallback: false });
    }
  });

  it("a reset-prod script nem tartalmaz jelszót", () => {
    const src = readFileSync("prisma/reset-prod.ts", "utf8");
    expect(src).not.toMatch(/ADMIN_PASSWORD\s*=\s*"/);
    expect(src).toContain("process.env.RESET_ADMIN_PASSWORD");
  });
});
