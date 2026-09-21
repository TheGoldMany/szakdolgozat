import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Csatolt Stripe fiók állapota.
 *
 * A védendő pontok:
 *
 * • A TESZT és az ÉLES Stripe két külön világ. Egy teszt módban létrehozott
 *   `acct_…` az éles kulccsal nem létezik, és a Stripe erre azt válaszolja,
 *   hogy „does not have access to account". A tárolt
 *   `stripeOnboardingComplete` viszont marad `true` — ezért kell a valós
 *   állapotot megkérdezni, különben a felület zöld pipával azt állítja, hogy
 *   az adományok megérkeznek, miközben a fizetési útvonal elutasítja őket.
 *
 * • A HOZZÁFÉRÉSI HIBÁT szűken kell felismerni. Korábban a kapcsolódási
 *   útvonal MINDEN `StripeInvalidRequestError`-t elavult fióknak vett, és
 *   ilyenkor új Stripe fiókot hozott létre. Egy rossz `return_url` így
 *   elárvította volna a menhely valódi, működő fiókját.
 *
 * • A HÁLÓZATI HIBÁBÓL nem következik, hogy a fiók rossz. Arra „unknown" jár,
 *   nem „inaccessible" — hamis riasztás rosszabb, mint a bizonytalanság.
 */

const retrieve = vi.fn();

vi.mock("stripe", () => ({
  default: class {
    accounts = { retrieve };
  },
}));

const { isStaleAccountError, connectedAccountState } = await import("@/lib/stripe");

/**
 * FIGYELEM: az itt szereplő kulcsok és fiókazonosítók SZÁNDÉKOSAN nem
 * valósághűek (`sk_live_REDACTED`, `acct_TESZT`). Egy valósághű alakú kitalált
 * kulcsot a GitHub titok-szkennere valódinak vesz, és elutasítja a push-t —
 * ez egyszer már megtörtént. A tesztnek csak annyi kell, hogy a szöveg
 * tartalmazza az `sk_live` részt, amire a kiszivárgást vizsgáló állítás épül.
 */

/** Ahogy a Stripe csomag a hibákat adja: sima objektum `type`/`code`/`message`-dzsel. */
function stripeError(fields: { type?: string; code?: string; message?: string }) {
  return Object.assign(new Error(fields.message ?? "hiba"), fields);
}

beforeEach(() => {
  retrieve.mockReset();
  process.env.STRIPE_SECRET_KEY = "sk_test_teszt";
});

describe("isStaleAccountError", () => {
  it("felismeri az éles kulcs / teszt fiók ütközést a Stripe szövegéből", () => {
    // Szó szerint ezt adta a Stripe éles üzemben:
    const err = stripeError({
      type: "StripePermissionError",
      message:
        "The provided key 'sk_live_***' does not have access to account "
        + "'acct_TESZT' (or that account does not exist). "
        + "Application access may have been revoked.",
    });
    expect(isStaleAccountError(err)).toBe(true);
  });

  it("felismeri a Stripe hozzáférési hibakódjait", () => {
    expect(isStaleAccountError(stripeError({ code: "account_invalid" }))).toBe(true);
    expect(isStaleAccountError(stripeError({ code: "resource_missing" }))).toBe(true);
    expect(isStaleAccountError(stripeError({ type: "StripePermissionError" }))).toBe(true);
  });

  it("felismeri a másik platformhoz tartozó fiókot és a hiányzó célpontot", () => {
    expect(isStaleAccountError(stripeError({
      message: "The account specified is not connected to your platform.",
    }))).toBe(true);
    expect(isStaleAccountError(stripeError({
      message: "No such destination: 'acct_123'",
    }))).toBe(true);
  });

  it("NEM vesz elavult fióknak minden érvénytelen kérést", () => {
    // Ez a lényeg: erre a hibára korábban ÚJ Stripe fiók készült, és a
    // menhely valódi fiókja elárvult volna.
    const err = stripeError({
      type:    "StripeInvalidRequestError",
      code:    "url_invalid",
      message: "Invalid URL: return_url must be an absolute URL",
    });
    expect(isStaleAccountError(err)).toBe(false);
  });

  it("nem hasal el nem-hiba értékeken", () => {
    expect(isStaleAccountError(null)).toBe(false);
    expect(isStaleAccountError(undefined)).toBe(false);
    expect(isStaleAccountError("szöveg")).toBe(false);
    expect(isStaleAccountError(new Error("valami más"))).toBe(false);
  });
});

describe("connectedAccountState", () => {
  it("azonosító nélkül: missing", async () => {
    expect(await connectedAccountState(null)).toBe("missing");
    expect(await connectedAccountState(undefined)).toBe("missing");
    expect(await connectedAccountState("")).toBe("missing");
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("befejezett folyamat: ready", async () => {
    retrieve.mockResolvedValue({ details_submitted: true, charges_enabled: true });
    expect(await connectedAccountState("acct_1")).toBe("ready");
  });

  it("be nem fejezett folyamat: incomplete", async () => {
    retrieve.mockResolvedValue({ details_submitted: false });
    expect(await connectedAccountState("acct_1")).toBe("incomplete");
  });

  it("charges_enabled=false még nem baj, ha a folyamat kész", async () => {
    // Destination charge-nál a PLATFORM terheli a kártyát; a
    // `charges_enabled` csak a közvetlen terhelést gátolja. Ha ezt
    // kapunapként kezelnénk, működő menhelyeket zárnánk ki.
    retrieve.mockResolvedValue({ details_submitted: true, charges_enabled: false });
    expect(await connectedAccountState("acct_1")).toBe("ready");
  });

  it("hozzáférési hiba: inaccessible", async () => {
    retrieve.mockRejectedValue(stripeError({
      type:    "StripePermissionError",
      message: "The provided key 'sk_live_***' does not have access to account 'acct_1'.",
    }));
    expect(await connectedAccountState("acct_1")).toBe("inaccessible");
  });

  it("hálózati hiba: unknown, NEM inaccessible", async () => {
    retrieve.mockRejectedValue(new Error("ECONNRESET"));
    expect(await connectedAccountState("acct_1")).toBe("unknown");
  });
});

/**
 * A vezérlőpult-hivatkozás végpontja.
 *
 * Ez az a hívás, ami éles üzemben elhasalt: a „Stripe fiók kezelése" gomb a
 * Stripe NYERS, angol hibaszövegét írta ki a menhely adminjának — benne a
 * platform titkos kulcsának a végével és a belső `acct_` azonosítóval. Ez a
 * teszt azt védi, hogy ez ne fordulhasson elő újra.
 */
describe("POST /api/stripe/connect/dashboard", () => {
  const createLoginLink = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    createLoginLink.mockReset();
  });

  async function callRoute() {
    vi.doMock("next-auth/next", () => ({
      getServerSession: async () => ({ user: { id: "u1", role: "SUPER_ADMIN" } }),
    }));
    vi.doMock("@/lib/auth", () => ({ authOptions: {} }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        shelter: { findUnique: async () => ({ stripeAccountId: "acct_TESZT" }) },
        shelterAdmin: { findUnique: async () => ({ id: "a1" }) },
        user: { findUnique: async () => ({ stripeAccountId: null }) },
      },
    }));
    vi.doMock("@/lib/stripe", async () => {
      const real = await vi.importActual<typeof import("@/lib/stripe")>("@/lib/stripe");
      return {
        ...real,
        getStripe: () => ({ accounts: { createLoginLink } }),
      };
    });

    const { POST } = await import("@/app/api/stripe/connect/dashboard/route");
    const req = new Request("http://localhost/api/stripe/connect/dashboard", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ shelterId: "s1" }),
    });
    const res = await POST(req as never);
    return { status: res.status, body: await res.json() };
  }

  it("elérhetetlen fióknál magyar üzenetet ad, és NEM szivárogtatja a kulcsot", async () => {
    createLoginLink.mockRejectedValue(Object.assign(
      new Error(
        "The provided key 'sk_live_REDACTED' does not have access "
        + "to account 'acct_TESZT' (or that account does not exist). "
        + "Application access may have been revoked.",
      ),
      { type: "StripePermissionError" },
    ));

    const { status, body } = await callRoute();

    // 409: ez állapot, nem szerverhiba – a felhasználó meg tudja oldani.
    expect(status).toBe(409);
    expect(body.code).toBe("account_inaccessible");
    // A válasz magyar, és nem tartalmazza sem a kulcsot, sem a fiókazonosítót.
    expect(body.error).toContain("Kapcsolódj újra");
    expect(JSON.stringify(body)).not.toContain("sk_live");
    expect(JSON.stringify(body)).not.toContain("acct_");
  });

  it("sikeres hívásnál a bejelentkezési hivatkozást adja vissza", async () => {
    createLoginLink.mockResolvedValue({ url: "https://connect.stripe.com/express/abc" });
    const { status, body } = await callRoute();
    expect(status).toBe(200);
    expect(body.url).toBe("https://connect.stripe.com/express/abc");
  });

  it("egyéb hibánál sem adja ki a Stripe nyers szövegét", async () => {
    createLoginLink.mockRejectedValue(new Error("Belső Stripe részlet: titkos_nyom"));
    const { status, body } = await callRoute();
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("titkos_nyom");
  });
});
