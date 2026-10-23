import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Bejelentés koordinátáinak pótlása.
 *
 * A HIBA, AMIT EZ VÉD: a helyválasztó nélkül (csak városnévvel) feladott
 * bejelentés koordináta nélkül mentődött, és a térkép-végpont, amely csak a
 * koordinátás sorokat adja vissza, soha nem mutatta meg.
 */

const geocodeCalls: unknown[] = [];
const updates: { id: string; data: { lat: number; lng: number } }[] = [];
let missingRows: { id: string; city: string; address: string | null }[] = [];

vi.mock("@/lib/geo", () => ({
  geocodeAddress: async (parts: { city?: string | null }) => {
    geocodeCalls.push(parts);
    return parts.city === "Sehol" ? null : { lat: 47.2, lng: 19.7 };
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    animalReport: {
      findMany: async () => missingRows,
      update:   async (args: { where: { id: string }; data: { lat: number; lng: number } }) => {
        updates.push({ id: args.where.id, data: args.data });
      },
    },
  },
}));

const { geocodeReportLocation, backfillReportCoords } = await import("@/lib/report-location");

beforeEach(() => {
  geocodeCalls.length = 0;
  updates.length = 0;
  missingRows = [];
  vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 2000 });
});

describe("geocodeReportLocation", () => {
  it("a megadott koordinátát nem írja felül, és nem hív geokódolót", async () => {
    expect(await geocodeReportLocation({ lat: 46, lng: 18, city: "Pécs" })).toEqual({ lat: 46, lng: 18 });
    expect(geocodeCalls).toHaveLength(0);
  });

  it("koordináta nélkül a település alapján pótol", async () => {
    expect(await geocodeReportLocation({ city: "Ceglédbercel" })).toEqual({ lat: 47.2, lng: 19.7 });
  });

  it("település és cím nélkül nem próbálkozik", async () => {
    expect(await geocodeReportLocation({ city: "  " })).toBeNull();
    expect(geocodeCalls).toHaveLength(0);
  });
});

describe("backfillReportCoords", () => {
  it("csak a koordinátát írja a talált sorokba, a nem azonosíthatót kihagyja", async () => {
    missingRows = [
      { id: "r1", city: "Ceglédbercel", address: null },
      { id: "r2", city: "Sehol",        address: null },
    ];
    expect(await backfillReportCoords()).toBe(1);
    expect(updates).toEqual([{ id: "r1", data: { lat: 47.2, lng: 19.7 } }]);
  });
});
