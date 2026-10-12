import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * A négy nyelvi fájl kulcskészletének egyeznie kell.
 *
 * MIÉRT TESZT, ÉS NEM ÍRÁSOS SZABÁLY
 *
 * A hiányzó kulcs a next-intl-ben nem állítja meg a renderelést: a felületen
 * megjelenik maga a kulcs neve (`donate.feeLineTotal`), vagy angol fallback
 * szöveg egy magyar oldalon. Tehát a hiba NEM a fejlesztőnél jelentkezik, aki
 * magyarul dolgozik — hanem a lengyel látogatónál, aki soha nem fogja jelezni.
 *
 * Az első bővítés, ami ezt elfelejti, csendben ront. A `docs/19` kimondja a
 * szabályt; ez kényszeríti ki.
 */

const LOCALES = ["hu", "en", "de", "pl"] as const;

type Json = { [key: string]: Json | string };

function load(locale: string): Json {
  return JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Json;
}

/** Minden kulcs pontozott útvonalként, a fákkal együtt. */
function flatKeys(obj: Json, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.add(path);
    if (typeof value === "object" && value !== null) {
      for (const nested of flatKeys(value, path)) out.add(nested);
    }
  }
  return out;
}

/** A `{placeholder}` nevek egy szövegben. */
function placeholders(text: string): Set<string> {
  return new Set([...text.matchAll(/\{(\w+)[^}]*\}/g)].map((m) => m[1]));
}

function flatStrings(obj: Json, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatStrings(value, path)) out.set(k, v);
  }
  return out;
}

const messages = Object.fromEntries(LOCALES.map((l) => [l, load(l)])) as Record<string, Json>;

describe("nyelvi fájlok", () => {
  it("mind a négy fájl betölthető és nem üres", () => {
    for (const locale of LOCALES) {
      expect(flatKeys(messages[locale]).size).toBeGreaterThan(1000);
    }
  });

  it("a kulcskészlet pontosan egyezik mind a négy nyelven", () => {
    const base = flatKeys(messages.hu);

    for (const locale of LOCALES.filter((l) => l !== "hu")) {
      const other   = flatKeys(messages[locale]);
      const missing = [...base].filter((k) => !other.has(k)).sort();
      const extra   = [...other].filter((k) => !base.has(k)).sort();

      // A hibaüzenet magukat a kulcsokat sorolja fel: egy puszta
      // „1851 !== 1850" összehasonlításból nem derülne ki, mit kell felvenni.
      expect({ locale, missing, extra }).toEqual({ locale, missing: [], extra: [] });
    }
  });

  it("a behelyettesítendő nevek is egyeznek", () => {
    // Egy lefordított szövegből kimaradt `{amount}` nem hiányzó kulcs, tehát a
    // fenti teszt nem fogja meg — a felületen viszont egyszerűen eltűnik az
    // összeg. Egy ELÍRT név (`{ammount}`) ennél rosszabb: a next-intl hibát dob
    // rá futásidőben, és az oldal összeomlik azon az egy nyelven.
    const base = flatStrings(messages.hu);

    for (const locale of LOCALES.filter((l) => l !== "hu")) {
      const other = flatStrings(messages[locale]);
      const mismatched: string[] = [];

      for (const [key, huText] of base) {
        const translated = other.get(key);
        if (translated === undefined) continue; // ezt a fenti teszt jelzi

        const expected = [...placeholders(huText)].sort();
        const actual   = [...placeholders(translated)].sort();
        if (expected.join(",") !== actual.join(",")) {
          mismatched.push(`${key}: hu=[${expected}] ${locale}=[${actual}]`);
        }
      }

      expect({ locale, mismatched }).toEqual({ locale, mismatched: [] });
    }
  });

  it("nincs üres fordítás", () => {
    for (const locale of LOCALES) {
      const empty = [...flatStrings(messages[locale])]
        .filter(([, v]) => v.trim() === "")
        .map(([k]) => k);
      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });
});
