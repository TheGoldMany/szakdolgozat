import { describe, it, expect } from "vitest";
import Stripe from "stripe";
import {
  verifyWebhook, webhookSecrets, secretsNeedingTrim,
  parseSignatureHeader, peekUnverified, explainFailure,
} from "@/lib/stripe-webhook";

/**
 * A Stripe-webhook aláírás-ellenőrzése.
 *
 * Ezek a tesztek VALÓDI Stripe-aláírásokat gyártanak (a hivatalos SDK
 * `generateTestHeaderString` függvényével), nem utánzatot. Egy kézzel írt
 * „úgy nézzen ki, mint egy aláírás" semmit nem bizonyítana arról, hogy élesben
 * is átmegy.
 *
 * Amit védeni kell:
 *
 * • TÖBB TITOK. A Connect endpointnak SAJÁT aláíró titka van. Ha csak az
 *   elsővel próbálkoznánk, annak minden kézbesítése elbukna — pont a
 *   visszatérítések és a viták.
 * • A BEMÁSOLÁSI HIBA NE BUKTASSA EL. Egy idézőjel vagy újsor a hosting env
 *   felületén némán rossz titkot csinál a jó titokból.
 * • AZ OKOK NE MOSÓDJANAK ÖSSZE. Óracsúszásnál a titok cseréje nem segít;
 *   hiányzó v1= esetén sem. Ha mindhárom ugyanazt az üzenetet adná, a
 *   hibakeresés találgatás lenne.
 * • A TITOK NEM SZIVÁROG. A diagnózis nyilvános válaszba kerül, tehát sem a
 *   titok, sem annak részlete nem lehet benne.
 */

/** Verifikáláshoz nem kell élő kulcs – az aláírás-ellenőrzés tisztán helyi. */
const stripe = new Stripe("sk_test_dummy_nem_valodi", { apiVersion: "2026-03-25.dahlia" });
const verifier = (body: string, header: string, secret: string) =>
  stripe.webhooks.constructEvent(body, header, secret);

const PLATFORM_SECRET = "whsec_platformtitokteszt1234567890";
const CONNECT_SECRET  = "whsec_connecttitokteszt0987654321";

function payload(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: "evt_teszt", type: "charge.refunded", livemode: true,
    data: { object: {} }, ...extra,
  });
}

/**
 * Valódi, a Stripe által is elfogadott aláírás-fejléc.
 *
 * A `cast` azért kell, mert az SDK típusdefiníciója a `scheme`, `signature` és
 * `cryptoProvider` mezőket kötelezőnek jelöli, futásidőben viszont mindhárom
 * opcionális (a könyvtár maga számolja ki őket). A dokumentált használat pont
 * ez a három mező nélkül.
 */
function sign(body: string, secret: string, timestamp: number): string {
  return stripe.webhooks.generateTestHeaderString(
    { payload: body, secret, timestamp } as Parameters<typeof stripe.webhooks.generateTestHeaderString>[0],
  );
}

const NOW = 1_800_000_000;

function verify(body: string, header: string | null, secrets: string[], nowSeconds = NOW) {
  return verifyWebhook(body, header, { secrets, env: {}, nowSeconds, verifier });
}

describe("titkok beolvasása", () => {
  it("mindkét env változóból olvas, sorrendben", () => {
    expect(webhookSecrets({
      STRIPE_WEBHOOK_SECRET:         PLATFORM_SECRET,
      STRIPE_CONNECT_WEBHOOK_SECRET: CONNECT_SECRET,
    })).toEqual([PLATFORM_SECRET, CONNECT_SECRET]);
  });

  it("levágja a bemásoláskor beszökő idézőjelet és szóközt", () => {
    expect(webhookSecrets({ STRIPE_WEBHOOK_SECRET: `  "${PLATFORM_SECRET}"\n` }))
      .toEqual([PLATFORM_SECRET]);
  });

  it("egy változóban vesszővel több titkot is elfogad (rotáció)", () => {
    expect(webhookSecrets({ STRIPE_WEBHOOK_SECRET: `${PLATFORM_SECRET}, ${CONNECT_SECRET}` }))
      .toEqual([PLATFORM_SECRET, CONNECT_SECRET]);
  });

  it("nem veszi fel kétszer ugyanazt", () => {
    expect(webhookSecrets({
      STRIPE_WEBHOOK_SECRET:         PLATFORM_SECRET,
      STRIPE_CONNECT_WEBHOOK_SECRET: PLATFORM_SECRET,
    })).toEqual([PLATFORM_SECRET]);
  });

  it("üres környezetben üres listát ad, nem dob", () => {
    expect(webhookSecrets({})).toEqual([]);
  });

  it("megszámolja, hány értéken kellett tisztítani", () => {
    expect(secretsNeedingTrim({ STRIPE_WEBHOOK_SECRET: `"${PLATFORM_SECRET}"` })).toBe(1);
    expect(secretsNeedingTrim({ STRIPE_WEBHOOK_SECRET: PLATFORM_SECRET })).toBe(0);
  });
});

describe("sikeres ellenőrzés", () => {
  it("átengedi a helyes aláírást", () => {
    const body = payload();
    const result = verify(body, sign(body, PLATFORM_SECRET, NOW), [PLATFORM_SECRET]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.type).toBe("charge.refunded");
      expect(result.secretIndex).toBe(0);
    }
  });

  it("a MÁSODIK titokkal aláírt kérést is átengedi (Connect endpoint)", () => {
    // Ez a teszt a lényeg: egyetlen titokkal ez a kézbesítés elbukott volna,
    // és a csatolt fiókok minden visszatérítése/vitája elveszett volna.
    const body = payload({ account: "acct_teszt" });
    const result = verify(body, sign(body, CONNECT_SECRET, NOW), [PLATFORM_SECRET, CONNECT_SECRET]);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.secretIndex).toBe(1);
  });

  it("az idézőjelekkel bemásolt titok mellett is átmegy a valódi aláírás", () => {
    // A bemásolási hiba végponttól végpontig: az env érték idézőjeles, az
    // aláírás a tiszta titokkal készült. Tisztítás nélkül ez 400-at adna.
    const body = payload();
    const result = verifyWebhook(body, sign(body, PLATFORM_SECRET, NOW), {
      env:        { STRIPE_WEBHOOK_SECRET: `"${PLATFORM_SECRET}"` },
      nowSeconds: NOW,
      verifier,
    });

    expect(result.ok).toBe(true);
  });
});

describe("a bukás okai nem mosódnak össze", () => {
  it("hiányzó fejléc", () => {
    const result = verify(payload(), null, [PLATFORM_SECRET]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnosis.reason).toBe("no_signature_header");
  });

  it("üres törzs", () => {
    const result = verify("", sign("", PLATFORM_SECRET, NOW), [PLATFORM_SECRET]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnosis.reason).toBe("empty_body");
  });

  it("értelmezhetetlen fejléc (egy proxy átírta)", () => {
    const result = verify(payload(), "valami egészen más", [PLATFORM_SECRET]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnosis.reason).toBe("malformed_signature_header");
  });

  it("nincs beállítva titok", () => {
    const body = payload();
    const result = verify(body, sign(body, PLATFORM_SECRET, NOW), []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnosis.reason).toBe("no_secret_configured");
  });

  it("óracsúszás – KÜLÖN ok, nem aláírás-hiba", () => {
    // Az aláírás itt matematikailag HELYES, csak öreg. Ha ezt „rossz titoknak"
    // mondanánk, az üzemeltető a titkot cserélné, és semmit nem javítana.
    const body = payload();
    const result = verify(body, sign(body, PLATFORM_SECRET, NOW - 3600), [PLATFORM_SECRET]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnosis.reason).toBe("timestamp_out_of_tolerance");
      expect(result.diagnosis.clockSkewSeconds).toBe(3600);
    }
  });

  it("a tűréshatáron belüli csúszás még átmegy", () => {
    const body = payload();
    const result = verify(body, sign(body, PLATFORM_SECRET, NOW - 120), [PLATFORM_SECRET]);
    expect(result.ok).toBe(true);
  });

  it("rossz titok", () => {
    const body = payload();
    const result = verify(body, sign(body, "whsec_egeszen_mas_titok_111111", NOW), [PLATFORM_SECRET]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnosis.reason).toBe("signature_mismatch");
      expect(result.diagnosis.secretsTried).toBe(1);
    }
  });
});

describe("a diagnózis használható", () => {
  it("csatolt fiók eseményénél a Connect titokra irányít", () => {
    const body = payload({ account: "acct_teszt" });
    const result = verify(body, sign(body, "whsec_rossz_titok_2222222222", NOW), [PLATFORM_SECRET]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnosis.connectedAccountEvent).toBe(true);
      expect(explainFailure(result.diagnosis)).toContain("STRIPE_CONNECT_WEBHOOK_SECRET");
    }
  });

  it("platform-eseménynél a küldő módját írja ki (teszt/éles keveredés)", () => {
    const body = payload({ livemode: false });
    const result = verify(body, sign(body, "whsec_rossz_titok_3333333333", NOW), [PLATFORM_SECRET]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnosis.eventLivemode).toBe(false);
      expect(result.diagnosis.connectedAccountEvent).toBe(false);
      expect(explainFailure(result.diagnosis)).toContain("livemode=false");
    }
  });

  it("minden okra ad emberi magyarázatot", () => {
    const reasons = [
      "no_signature_header", "empty_body", "malformed_signature_header",
      "no_secret_configured", "timestamp_out_of_tolerance", "signature_mismatch",
    ] as const;

    for (const reason of reasons) {
      const text = explainFailure({
        reason, secretsTried: 1, secretsNeedingTrim: 0, signatureCount: 1,
        clockSkewSeconds: 0, bodyBytes: 10, eventType: null,
        connectedAccountEvent: false, eventLivemode: true,
      });
      expect(text.length).toBeGreaterThan(20);
    }
  });

  it("A DIAGNÓZIS NEM TARTALMAZZA A TITKOT", () => {
    // A diagnózis nyilvános HTTP-válaszba kerül. Ha a titok bármelyik része
    // beszivárogna, azzal bárki hamisíthatna aláírt webhookot.
    const body = payload();
    const result = verify(body, sign(body, "whsec_rossz_titok_4444444444", NOW), [PLATFORM_SECRET, CONNECT_SECRET]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialised = JSON.stringify(result.diagnosis) + explainFailure(result.diagnosis);
      expect(serialised).not.toContain(PLATFORM_SECRET);
      expect(serialised).not.toContain(CONNECT_SECRET);
      // Részlet sem: sem az eleje, sem a vége.
      expect(serialised).not.toContain(PLATFORM_SECRET.slice(6, 16));
      expect(serialised).not.toContain(PLATFORM_SECRET.slice(-8));
    }
  });
});

describe("segédfüggvények", () => {
  it("a fejléc felbontása megszámolja a v1 aláírásokat", () => {
    expect(parseSignatureHeader("t=1800000000,v1=aaa,v1=bbb"))
      .toEqual({ timestamp: 1_800_000_000, v1Count: 2 });
    expect(parseSignatureHeader("")).toEqual({ timestamp: null, v1Count: 0 });
  });

  it("a hitelesítetlen belenézés hibás JSON-on sem dob", () => {
    expect(peekUnverified("{nem json")).toEqual({ type: null, account: null, livemode: null });
  });
});
