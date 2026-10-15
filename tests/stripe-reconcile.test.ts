import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Utólagos egyeztetés a Stripe eseménylistájából.
 *
 * Amit védeni kell:
 *
 * • A SORREND. A `checkout.session.completed` hozza létre az előfizetés sorát,
 *   amit az `invoice.payment_succeeded` keres. A Stripe a legújabbat adja
 *   előbb; ha ebben a sorrendben dolgoznánk, a számla nem találna sort.
 * • AMI MÁR MEGVAN, AZT NEM BÁNTJUK. Egy napi cron minden futáskor ugyanazt a
 *   hetet látja; ha nem lépne ki a már feldolgozottakon, minden éjjel
 *   újraküldené az értesítéseket és e-maileket.
 * • A HIBÁS ÁG NEM LESZ „FELDOLGOZOTT". Különben egyetlen átmeneti adatbázis-
 *   hiba véglegesen eltüntetné az eseményt, és pont azt veszítenénk el, amiért
 *   ez az egész modul létezik.
 * • AZ IDŐKORLÁT. A kiszolgáló kivégzi a függvényt a saját határánál; egy
 *   félúton megszakított futás `markProcessed` nélkül hagyná az elvégzett
 *   munkát, és a következő futás ugyanonnan kezdené — örökké.
 * • A TÍPUSLISTA NE CSÚSZHASSON SZÉT a tényleges ágakétól. Egy itt kimaradt
 *   típust a cron sosem kérne le a Stripe-tól: a hiba működőnek látszana.
 */

interface FakeEvent { id: string; type: string; created: number }

const stripeEvents: FakeEvent[] = [];
let listCalls: unknown[] = [];

const processed = new Set<string>();
const marked: string[] = [];
/** Eseményazonosító → az ágak, amelyek hibára futnak. */
let failing: Record<string, string[]> = {};
const handled: string[] = [];

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    events: {
      list: (params: unknown) => {
        listCalls.push(params);
        // A Stripe a LEGÚJABBAT adja előbb – a modulnak ezt kell megfordítania.
        const newestFirst = [...stripeEvents].sort((a, b) => b.created - a.created);
        return {
          async *[Symbol.asyncIterator]() {
            for (const e of newestFirst) yield e;
          },
        };
      },
    },
  }),
}));

vi.mock("@/lib/stripe-events", () => ({
  handleStripeEvent: async (event: FakeEvent) => {
    handled.push(event.id);
    return failing[event.id] ?? [];
  },
}));

vi.mock("@/lib/webhook-events", () => ({
  alreadyProcessed: async (id: string) => processed.has(id),
  markProcessed:    async (id: string) => { marked.push(id); processed.add(id); },
}));

const { reconcileStripeEvents, RECONCILED_EVENT_TYPES, MAX_LOOKBACK_DAYS } =
  await import("@/lib/stripe-reconcile");

function event(id: string, created: number, type = "charge.refunded"): FakeEvent {
  return { id, type, created };
}

beforeEach(() => {
  stripeEvents.length = 0;
  listCalls = [];
  processed.clear();
  marked.length = 0;
  handled.length = 0;
  failing = {};
});

describe("a kimaradt események pótlása", () => {
  it("feldolgozza és feldolgozottnak jelöli a kimaradtakat", async () => {
    stripeEvents.push(event("evt_1", 100), event("evt_2", 200));

    const result = await reconcileStripeEvents();

    expect(result.recovered).toBe(2);
    expect(result.alreadyDone).toBe(0);
    expect(marked).toEqual(["evt_1", "evt_2"]);
  });

  it("A LEGRÉGEBBIVEL KEZD, nem a legújabbal", async () => {
    // A Stripe fordított sorrendben adja vissza. Ha nem fordítanánk meg, az
    // előfizetést létrehozó esemény a rá épülő számla UTÁN futna le.
    stripeEvents.push(
      event("evt_szamla", 300, "invoice.payment_succeeded"),
      event("evt_checkout", 100, "checkout.session.completed"),
      event("evt_kozepso", 200),
    );

    await reconcileStripeEvents();

    expect(handled).toEqual(["evt_checkout", "evt_kozepso", "evt_szamla"]);
  });

  it("kilép a már feldolgozott eseményen, és nem hívja meg újra", async () => {
    stripeEvents.push(event("evt_regi", 100), event("evt_uj", 200));
    processed.add("evt_regi");

    const result = await reconcileStripeEvents();

    expect(result.alreadyDone).toBe(1);
    expect(result.recovered).toBe(1);
    expect(handled).toEqual(["evt_uj"]);
  });

  it("a második futás már nem dolgoz fel semmit (idempotens)", async () => {
    stripeEvents.push(event("evt_1", 100), event("evt_2", 200));

    await reconcileStripeEvents();
    handled.length = 0;
    const second = await reconcileStripeEvents();

    expect(second.recovered).toBe(0);
    expect(second.alreadyDone).toBe(2);
    expect(handled).toEqual([]);
  });

  it("üres eseménylistán nem dob, és nullát ad", async () => {
    const result = await reconcileStripeEvents();
    expect(result).toMatchObject({ scanned: 0, recovered: 0, alreadyDone: 0, truncated: false });
  });
});

describe("hibás ág", () => {
  it("NEM jelöli feldolgozottnak a hibára futott eseményt", async () => {
    stripeEvents.push(event("evt_hibas", 100));
    failing = { evt_hibas: ["charge.refunded"] };

    const result = await reconcileStripeEvents();

    expect(result.recovered).toBe(0);
    expect(result.failures).toEqual({ evt_hibas: ["charge.refunded"] });
    expect(marked).toEqual([]);
  });

  it("a következő futás újra megpróbálja", async () => {
    stripeEvents.push(event("evt_hibas", 100));
    failing = { evt_hibas: ["charge.refunded"] };
    await reconcileStripeEvents();

    // Mire a cron másnap lefut, a hiba oka elmúlt.
    failing = {};
    const second = await reconcileStripeEvents();

    expect(second.recovered).toBe(1);
    expect(marked).toEqual(["evt_hibas"]);
  });

  it("egy hibás esemény nem akadályozza meg a többit", async () => {
    stripeEvents.push(event("evt_1", 100), event("evt_hibas", 200), event("evt_3", 300));
    failing = { evt_hibas: ["valami"] };

    const result = await reconcileStripeEvents();

    expect(result.recovered).toBe(2);
    expect(marked).toEqual(["evt_1", "evt_3"]);
  });
});

describe("korlátok", () => {
  it("a lekérdezés CSAK a kezelt típusokat kéri a Stripe-tól", async () => {
    await reconcileStripeEvents();

    const params = listCalls[0] as { types: string[]; created: { gte: number }; limit: number };
    expect(params.types).toEqual([...RECONCILED_EVENT_TYPES]);
    expect(params.limit).toBe(100);
  });

  it("a visszatekintés felső korlátja a Stripe 30 napos megőrzése", async () => {
    const result = await reconcileStripeEvents({ lookbackDays: 365 });
    expect(result.lookbackDays).toBe(MAX_LOOKBACK_DAYS);
  });

  it("legalább egy nap, akkor is, ha nullát vagy negatívat kérnek", async () => {
    expect((await reconcileStripeEvents({ lookbackDays: 0 })).lookbackDays).toBe(1);
    expect((await reconcileStripeEvents({ lookbackDays: -5 })).lookbackDays).toBe(1);
  });

  it("a megadott napokból helyes időbélyeget számol", async () => {
    await reconcileStripeEvents({ lookbackDays: 7 });

    const { created } = listCalls[0] as { created: { gte: number } };
    const expected = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    expect(Math.abs(created.gte - expected)).toBeLessThan(5);
  });

  it("a határidő lejártakor leáll, és ezt JELZI is", async () => {
    stripeEvents.push(event("evt_1", 100), event("evt_2", 200));

    const result = await reconcileStripeEvents({ deadlineMs: Date.now() - 1 });

    expect(result.truncated).toBe(true);
    // A csonkolás nem csendes: a hívó tudja, hogy van még hátra.
    expect(result.recovered).toBe(0);
  });

  it("a darabszám-korlát is csonkol", async () => {
    for (let i = 0; i < 10; i++) stripeEvents.push(event(`evt_${i}`, 100 + i));

    const result = await reconcileStripeEvents({ maxEvents: 3 });

    expect(result.truncated).toBe(true);
    expect(result.scanned).toBe(3);
  });
});

describe("a típuslista nem csúszhat szét az ágaktól", () => {
  it("minden kezelt eseménytípus szerepel a lekérdezésben", () => {
    // A `handleStripeEvent` ágait a forrásból olvassuk ki, nem egy kézzel
    // karbantartott listából – így ez a teszt akkor is szól, ha valaki új ágat
    // ír, de a cron típuslistájáról elfeledkezik. Az ilyen hiba működőnek
    // látszik: a webhook kezeli az eseményt, a cron viszont sosem kéri le.
    const source = readFileSync("lib/stripe-events.ts", "utf8");
    const branchTypes = new Set(
      [...source.matchAll(/event\.type === "([^"]+)"/g)].map((m) => m[1])
    );

    expect(branchTypes.size).toBeGreaterThan(0);
    for (const type of branchTypes) {
      expect(RECONCILED_EVENT_TYPES as readonly string[]).toContain(type);
    }
  });

  it("nem kér olyan típust, amire nincs ág", () => {
    const source = readFileSync("lib/stripe-events.ts", "utf8");
    const branchTypes = new Set(
      [...source.matchAll(/event\.type === "([^"]+)"/g)].map((m) => m[1])
    );

    for (const type of RECONCILED_EVENT_TYPES) {
      expect([...branchTypes]).toContain(type);
    }
  });
});
