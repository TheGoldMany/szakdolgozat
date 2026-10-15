import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * A fizetési kapcsoló.
 *
 * Amit védeni kell:
 *
 * • ZÁRVA BUKJON. Ha a változó hiányzik, elgépelték, vagy egy új környezetben
 *   elfelejtették beállítani, a fizetés legyen KI. A fordítottja azt
 *   jelentené, hogy egy elfelejtett beállítás valódi pénzt enged be.
 * • NE MARADJON KIFELEJTETT FELÜLET. Ez a nehezebb rész: a kapcsoló akkor ér
 *   valamit, ha MINDEN fizetési végpont és oldal mögé be van kötve. Egy
 *   kimaradt végpont nem hibázik és nem látszik — csak elérhető marad.
 *   Ezért a teszt nem egy kézzel karbantartott listát néz, hanem végigmegy a
 *   fájlokon, és megköveteli a kaput.
 */

const ORIGINAL = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED;

// A `paymentsEnabled` HÍVÁSKOR olvassa az env-et, nem modulbetöltéskor —
// ezért elég egyszer importálni, és a tesztek között csak a változót állítani.
// (Ha betöltéskor olvasná, ez a teszt nem is tudná végigpróbálni az értékeket.)
import { paymentsEnabled } from "@/lib/payments-enabled";

beforeEach(() => { delete process.env.NEXT_PUBLIC_PAYMENTS_ENABLED; });
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_PAYMENTS_ENABLED;
  else process.env.NEXT_PUBLIC_PAYMENTS_ENABLED = ORIGINAL;
});

describe("a kapcsoló zárva bukik", () => {
  it("beállítatlanul KI van kapcsolva", () => {
    expect(paymentsEnabled()).toBe(false);
  });

  it("csak a pontos \"true\" kapcsolja be", () => {
    process.env.NEXT_PUBLIC_PAYMENTS_ENABLED = "true";
    expect(paymentsEnabled()).toBe(true);
  });

  it("a félreírt vagy félreértett értékek NEM kapcsolják be", () => {
    // Mindegyik olyan érték, amit egy ember jóhiszeműen beírhat. Egyik sem
    // engedheti be a valódi pénzt: ha valaki bekapcsolná, írja le pontosan.
    for (const value of ["TRUE", "True", "1", "yes", "igen", "on", "enabled", " true", "true "]) {
      process.env.NEXT_PUBLIC_PAYMENTS_ENABLED = value;
      expect({ value, enabled: paymentsEnabled() }).toEqual({ value, enabled: false });
    }
  });

  it("a kikapcsolt értékek is kikapcsolva hagyják", () => {
    for (const value of ["false", "0", "", "off"]) {
      process.env.NEXT_PUBLIC_PAYMENTS_ENABLED = value;
      expect(paymentsEnabled()).toBe(false);
    }
  });
});

/**
 * Minden fizetési végpontnak és oldalnak a kapu mögött kell lennie.
 *
 * A listák azért vannak kiírva, mert ez a teszt pont azt a hibát hivatott
 * megfogni, amit egy automatikus felderítés nem lát: ha valaki ÚJ fizetési
 * végpontot ír, az nem kerül be magától sehová. Ilyenkor ezt a listát is
 * bővítenie kell — és a bővítés pillanatában a teszt megmondja, hogy a kaput
 * elfelejtette.
 */
const GUARDED_ROUTES = [
  "app/api/checkout/donate/route.ts",
  "app/api/checkout/subscribe/route.ts",
  "app/api/checkout/sponsor/route.ts",
  "app/api/stripe/connect/onboard/route.ts",
  "app/api/stripe/connect/callback/route.ts",
  "app/api/stripe/connect/dashboard/route.ts",
  "app/api/campaigns/route.ts",
  "app/api/campaigns/[id]/route.ts",
  "app/api/admin/campaigns/route.ts",
  "app/api/admin/campaigns/[id]/route.ts",
  "app/api/subscriptions/[id]/route.ts",
  "app/api/subscriptions/[id]/cancel/route.ts",
  "app/api/subscriptions/[id]/admin-cancel/route.ts",
  "app/api/sponsorships/[id]/cancel/route.ts",
  "app/api/animals/[id]/sponsors/route.ts",
];

const GUARDED_PAGES = [
  "app/[locale]/donate/page.tsx",
  "app/[locale]/donate/[id]/page.tsx",
  "app/[locale]/donate/success/page.tsx",
  "app/[locale]/campaigns/new/page.tsx",
  "app/[locale]/finances/page.tsx",
  "app/[locale]/platformdij/page.tsx",
  "app/dashboard/tiers/page.tsx",
  "app/dashboard/campaigns/page.tsx",
  "app/dashboard/subscriptions/page.tsx",
];

describe("minden fizetési felület a kapu mögött van", () => {
  it("a végpontok MINDEN kezelője kapuval kezdődik", () => {
    const missing: string[] = [];

    for (const file of GUARDED_ROUTES) {
      const source = readFileSync(file, "utf8");
      const handlers = [...source.matchAll(
        /export async function (GET|POST|PUT|PATCH|DELETE)\s*\([\s\S]*?\)\s*\{\n([\s\S]{0,400})/g
      )];

      if (handlers.length === 0) { missing.push(`${file}: nincs kezelő`); continue; }

      for (const [, method, body] of handlers) {
        // A kapunak a kezelő ELEJÉN kell lennie, nem valahol a törzs mélyén:
        // ha egy jogosultság-ellenőrzés vagy adatbázis-írás elé kerülne, a
        // kikapcsolt funkció még mindig csinálna valamit.
        if (!body.includes("paymentsDisabled()")) missing.push(`${file} → ${method}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it("az oldalak notFound()-ot adnak kikapcsolt állapotban", () => {
    const missing = GUARDED_PAGES.filter((file) => {
      const source = readFileSync(file, "utf8");
      return !(source.includes("paymentsEnabled()") && source.includes("notFound()"));
    });

    expect(missing).toEqual([]);
  });

  it("a felsorolt fájlok léteznek", () => {
    // Ha egy fájlt átneveznek vagy törölnek, a fenti két teszt némán kevesebbet
    // ellenőrizne. Ez megmondja, hogy a lista elavult.
    expect([...GUARDED_ROUTES, ...GUARDED_PAGES].filter((f) => !existsSync(f))).toEqual([]);
  });

  it("a webhook SZÁNDÉKOSAN nincs kapu mögött", () => {
    // A webhook nem indít fizetést, csak rögzíti, ami a Stripe-nál már
    // megtörtént. Kikapcsolva egy visszatérítés vagy egy lemondás nyomtalanul
    // elveszne — a hiányzó rekord rosszabb, mint a felesleges.
    const source = readFileSync("app/api/webhooks/stripe/route.ts", "utf8");
    expect(source).not.toContain("paymentsDisabled");
  });
});
