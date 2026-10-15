import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Melyik menhely adatait olvashatja a kérő.
 *
 * A HIBA, AMIT EZ VÉD: három lista-végpont a `?shelterId=` paramétert
 * ellenőrzés nélkül fogadta el. Bármelyik bejelentkezett felhasználó
 * elolvashatta bármelyik menhely készletét, piszkozat eseményeit és
 * önkéntes-feladatait, ha beírta az azonosítót.
 */

const memberships: Record<string, string[]> = {};
const allShelters = ["sh_a", "sh_b", "sh_c"];

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    shelterAdmin: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        (memberships[where.userId] ?? []).map((shelterId) => ({ shelterId })),
    },
    shelter: { findMany: async () => allShelters.map((id) => ({ id })) },
  },
}));

const { permittedShelterIds } = await import("@/lib/acting-shelter");

beforeEach(() => {
  for (const k of Object.keys(memberships)) delete memberships[k];
});

describe("permittedShelterIds", () => {
  it("SIMA FELHASZNÁLÓ egy idegen menhelyet kérve SEMMIT nem kap", async () => {
    // Ez volt a rés: a kért azonosító egyenesen a lekérdezésbe került.
    expect(await permittedShelterIds("user_1", "USER", "sh_b")).toEqual([]);
  });

  it("menhelyi admin a saját menhelyét megkapja", async () => {
    memberships.admin_1 = ["sh_a"];
    expect(await permittedShelterIds("admin_1", "SHELTER_ADMIN", "sh_a")).toEqual(["sh_a"]);
  });

  it("menhelyi admin IDEGEN menhelyet kérve semmit nem kap", async () => {
    memberships.admin_1 = ["sh_a"];
    expect(await permittedShelterIds("admin_1", "SHELTER_ADMIN", "sh_b")).toEqual([]);
  });

  it("kérés nélkül az összes saját menhelyét adja", async () => {
    memberships.admin_1 = ["sh_a", "sh_c"];
    expect(await permittedShelterIds("admin_1", "SHELTER_ADMIN", null)).toEqual(["sh_a", "sh_c"]);
  });

  it("főadmin bármelyiket kérheti, kérés nélkül mindet kapja", async () => {
    expect(await permittedShelterIds("root", "SUPER_ADMIN", "sh_b")).toEqual(["sh_b"]);
    expect(await permittedShelterIds("root", "SUPER_ADMIN", null)).toEqual(allShelters);
  });

  it("a három érintett végpont ezt használja, nem a nyers paramétert", () => {
    for (const f of ["app/api/inventory/route.ts", "app/api/events/route.ts",
                     "app/api/volunteer-tasks/route.ts"]) {
      const src = readFileSync(f, "utf8");
      expect({ f, uses: src.includes("permittedShelterIds(") }).toEqual({ f, uses: true });
      expect({ f, raw: /shelterIds\s*=\s*\[\s*(shelterId|paramId)\s*\]/.test(src) })
        .toEqual({ f, raw: false });
    }
  });
});
