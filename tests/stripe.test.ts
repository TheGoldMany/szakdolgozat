import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MIN_CAMPAIGN_TARGET_HUF, MIN_DONATION_HUF } from "@/lib/donation-limits";
import {
  platformFee, PLATFORM_FEE_PERCENT, stripeProcessingFee,
  subscriptionFeePercent, subscriptionPlatformFee,
} from "@/lib/stripe";

describe("platformFee", () => {
  it("a platform díj 5%", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(5);
  });

  it("5%-ot számol egész forintra kerekítve", () => {
    expect(platformFee(1000)).toBe(50);
    expect(platformFee(10000)).toBe(500);
    expect(platformFee(5000)).toBe(250);
    expect(platformFee(2500)).toBe(125);
  });

  it("kerekíti a tört eredményt", () => {
    // 1010 * 0.05 = 50.5 → 51
    expect(platformFee(1010)).toBe(51);
    // 1001 * 0.05 = 50.05 → 50
    expect(platformFee(1001)).toBe(50);
    // 1003 * 0.05 = 50.15 → 50
    expect(platformFee(1003)).toBe(50);
  });

  it("nulla összegre nulla díj", () => {
    expect(platformFee(0)).toBe(0);
  });
});

describe("subscriptionFeePercent", () => {
  it("olyan százalékot ad, amivel a menhely a csomag árát kapja meg", () => {
    // A Stripe a százalékot a számla TELJES összegére alkalmazza.
    for (const amount of [500, 1000, 2000, 5000, 10_000, 50_000]) {
      const total   = amount + platformFee(amount) + stripeProcessingFee(amount);
      const pct     = subscriptionFeePercent(amount);
      const appFee  = subscriptionPlatformFee(total, pct);
      const shelter = total - appFee;

      // A két tizedes kerekítés miatt van pár forintos csúszás, de nem több.
      expect(Math.abs(shelter - amount)).toBeLessThanOrEqual(1);
    }
  });

  it("a nagyobb csomagnál arányosan kisebb a százalék (a fix 25 Ft eloszlik)", () => {
    expect(subscriptionFeePercent(500)).toBeGreaterThan(subscriptionFeePercent(50_000));
  });

  it("nulla összegre nulla százalék", () => {
    expect(subscriptionFeePercent(0)).toBe(0);
  });

  it("egy 5 000 Ft-os csomag 12 hónapja alatt a csúszás pár forint", () => {
    const amount = 5000;
    const total  = amount + platformFee(amount) + stripeProcessingFee(amount);
    const pct    = subscriptionFeePercent(amount);
    const yearly = 12 * (total - subscriptionPlatformFee(total, pct));

    expect(Math.abs(yearly - amount * 12)).toBeLessThanOrEqual(12);
  });
});

/**
 * A kiírt díjszázalék és a levont díj nem csúszhat szét.
 *
 * Éles üzemben szétcsúszott: a menhely beállítások oldala „4% platform díj"-at
 * írt, miközben a `PLATFORM_FEE_PERCENT` 5 volt. A menhely tehát mást olvasott,
 * mint ami történt — és pénzről van szó. A javítás után a szöveg a kódból veszi
 * a számot (`{fee}` helyőrző), ez a teszt pedig azt védi, hogy senki ne írjon
 * vissza kézzel egy számot a fordításokba.
 */
describe("a kiírt platformdíj", () => {
  const LANGS = ["hu", "en", "de", "pl"] as const;

  function stripeDesc(lang: string): string {
    const raw = readFileSync(`messages/${lang}.json`, "utf8");
    return JSON.parse(raw).dashboard.settingsStripeDesc as string;
  }

  it("mind a négy nyelven a kódból veszi a százalékot", () => {
    for (const lang of LANGS) {
      expect(stripeDesc(lang), lang).toContain("{fee}");
    }
  });

  it("egyik nyelven sincs kézzel beírt százalék", () => {
    for (const lang of LANGS) {
      // Bármilyen szám közvetlenül egy % előtt kézzel beírt díj lenne.
      expect(stripeDesc(lang), lang).not.toMatch(/\d\s*%/);
    }
  });

  it("a helyőrzőbe a tényleges konstans kerül", () => {
    // Ha valaki átírja a konstanst, a felület magától követi – nincs mit
    // külön frissíteni, és nincs mi elavuljon.
    expect(PLATFORM_FEE_PERCENT).toBeGreaterThan(0);
    expect(stripeDesc("hu").replace("{fee}", String(PLATFORM_FEE_PERCENT)))
      .toContain(`${PLATFORM_FEE_PERCENT}% platform díj`);
  });
});

/**
 * A gyűjtés minimum célösszege.
 *
 * A kiírt szabályt a SZERVER is kikényszeríti, nem csak az űrlap. Korábban a
 * `targetAmount` szerveroldali sémája `positive()` volt, tehát a végpontot
 * közvetlenül hívva 1 Ft-os célösszeg is átment — a felületen kiírt „minimum
 * 1 000 Ft" pedig csak kérés volt, nem szabály.
 */
describe("gyűjtés minimum célösszege", () => {
  it("a szöveg a kódból veszi az összeget, nem kézzel beírva", () => {
    for (const lang of ["hu", "en", "de", "pl"]) {
      const raw = readFileSync(`messages/${lang}.json`, "utf8");
      const text = JSON.parse(raw).donate.newTargetMin as string;
      expect(text, lang).toContain("{min}");
      // Kézzel beírt ezres összeg (pl. „1 000", „1000") nem lehet benne.
      expect(text, lang).not.toMatch(/\d[\d\s.,]*\d/);
    }
  });

  it("a szerveroldali séma ugyanazt a minimumot kéri, mint a felület", () => {
    // A séma szövegét olvassuk: futásidőben a zod objektum belső határát nem
    // lehet megkérdezni, a forrásban viszont látszik, hogy a konstansra hivatkozik.
    const route = readFileSync("app/api/campaigns/route.ts", "utf8");
    expect(route).toContain("MIN_CAMPAIGN_TARGET_HUF");
    expect(route).not.toMatch(/targetAmount:\s*z\.number\(\)\.int\(\)\.positive\(\)/);

    const adminRoute = readFileSync("app/api/admin/campaigns/[id]/route.ts", "utf8");
    expect(adminRoute).toContain("MIN_CAMPAIGN_TARGET_HUF");
  });

  it("a minimum értelmes és nem kisebb az adomány-minimumnál", () => {
    // Egy 500 Ft-os minimum adománynál kisebb célösszeg értelmetlen lenne:
    // az első adomány azonnal túlteljesítené a gyűjtést.
    expect(MIN_CAMPAIGN_TARGET_HUF).toBeGreaterThanOrEqual(MIN_DONATION_HUF);
  });
});
