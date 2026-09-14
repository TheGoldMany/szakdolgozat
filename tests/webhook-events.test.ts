import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Az esemény-szintű deduplikációt ellenőrzi.
 *
 * A védett viselkedés a sorrend: a jelölés a feldolgozás UTÁN történik. Ha az
 * elején foglalnánk le az eseményt, egy közben történő összeomlás örökre
 * „feldolgozottnak" jelölné azt, amit valójában senki nem végzett el — és mivel
 * a Stripe ilyenkor a 200-as választ sem kapta meg, az újraküldés is
 * hatástalan lenne. Ezért a `markProcessed` sosem hívódik hibás feldolgozás után.
 */

const db = { events: [] as { id: string; type: string }[] };

const prismaMock = {
  processedWebhookEvent: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.events.find((e) => e.id === where.id) ?? null,
    createMany: async ({ data }: { data: { id: string; type: string }[] }) => {
      let count = 0;
      for (const row of data) {
        if (db.events.some((e) => e.id === row.id)) continue;
        db.events.push(row);
        count++;
      }
      return { count };
    },
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { alreadyProcessed, markProcessed } = await import("@/lib/webhook-events");

beforeEach(() => { db.events = []; });

describe("alreadyProcessed / markProcessed", () => {
  it("ismeretlen eseményt nem tart feldolgozottnak", async () => {
    expect(await alreadyProcessed("evt_1")).toBe(false);
  });

  it("jelölés után feldolgozottnak tartja", async () => {
    await markProcessed("evt_1", "checkout.session.completed");

    expect(await alreadyProcessed("evt_1")).toBe(true);
    expect(db.events).toHaveLength(1);
  });

  it("kétszeri jelölés nem hoz létre második sort", async () => {
    await markProcessed("evt_1", "checkout.session.completed");
    await markProcessed("evt_1", "checkout.session.completed");

    expect(db.events).toHaveLength(1);
  });

  it("más eseményt nem érint", async () => {
    await markProcessed("evt_1", "charge.refunded");

    expect(await alreadyProcessed("evt_masik")).toBe(false);
  });

  it("a jelölés hibája nem dob – az esemény ekkor már el van végezve", async () => {
    const eredeti = prismaMock.processedWebhookEvent.createMany;
    prismaMock.processedWebhookEvent.createMany = async () => { throw new Error("adatbázis elérhetetlen"); };

    await expect(markProcessed("evt_hiba", "charge.refunded")).resolves.toBeUndefined();

    prismaMock.processedWebhookEvent.createMany = eredeti;
  });
});
