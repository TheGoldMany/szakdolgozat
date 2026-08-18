import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_TIERS, ALLOWED_TIER_AMOUNTS, isAllowedTierAmount, GENERAL_CAMPAIGN,
} from "@/lib/donation-tiers";

/**
 * A fix csomagok és az állandó gyűjtés viselkedését ellenőrzi.
 *
 * A lényeg, amit védeni kell:
 *   • a négy összeg platformszinten rögzített, más nem fogadható el;
 *   • a helper idempotens (visszatöltésre is ez fut);
 *   • a régi, egyedi összegű csomagokat NEM törli, csak inaktiválja — a rájuk
 *     előfizetők a Stripe-nál a belépéskori árat fizetik tovább.
 */

interface Tier { id: string; shelterId: string; amount: number; isActive: boolean }

const db = {
  shelter:   { id: "sh1", name: "Boldog Tappancs", slug: "boldog-tappancs" } as { id: string; name: string; slug: string } | null,
  tiers:     [] as Tier[],
  campaigns: [] as { shelterId: string; isGeneral: boolean; slug: string; status: string; endsAt: Date | null }[],
};

let seq = 0;

const prismaMock = {
  shelter:      { findUnique: async () => db.shelter },
  donationTier: {
    findMany:   async () => db.tiers,
    createMany: async ({ data }: { data: { shelterId: string; amount: number }[] }) => {
      for (const d of data) db.tiers.push({ id: `t${++seq}`, shelterId: d.shelterId, amount: d.amount, isActive: true });
      return { count: data.length };
    },
    updateMany: async ({ where, data }: { where: { id: { in: string[] } }; data: { isActive: boolean } }) => {
      let count = 0;
      for (const t of db.tiers) if (where.id.in.includes(t.id)) { t.isActive = data.isActive; count++; }
      return { count };
    },
  },
  campaign: {
    findFirst:  async ({ where }: { where: { shelterId: string; isGeneral: boolean } }) =>
      db.campaigns.find((c) => c.shelterId === where.shelterId && c.isGeneral) ?? null,
    findUnique: async ({ where }: { where: { slug: string } }) =>
      db.campaigns.find((c) => c.slug === where.slug) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      db.campaigns.push(data as never);
      return data;
    },
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { ensureShelterDefaults } = await import("@/lib/shelter-defaults");

beforeEach(() => {
  db.shelter   = { id: "sh1", name: "Boldog Tappancs", slug: "boldog-tappancs" };
  db.tiers     = [];
  db.campaigns = [];
  seq = 0;
});

describe("a rögzített csomagösszegek", () => {
  it("az 1-2-5 létra: 1000, 2000, 5000, 10000", () => {
    expect(ALLOWED_TIER_AMOUNTS).toEqual([1000, 2000, 5000, 10000]);
  });

  it("csak ezeket fogadja el", () => {
    expect(isAllowedTierAmount(1000)).toBe(true);
    expect(isAllowedTierAmount(10000)).toBe(true);
    expect(isAllowedTierAmount(1500)).toBe(false);
    expect(isAllowedTierAmount(175)).toBe(false);
    expect(isAllowedTierAmount(0)).toBe(false);
  });

  it("mindegyikhez tartozik név és leírás, amit a menhely átírhat", () => {
    for (const tier of DEFAULT_TIERS) {
      expect(tier.name.length).toBeGreaterThan(0);
      expect(tier.description.length).toBeGreaterThan(0);
    }
  });
});

describe("ensureShelterDefaults", () => {
  it("üres menhelynek létrehozza mind a négy csomagot és az állandó gyűjtést", async () => {
    const r = await ensureShelterDefaults("sh1");

    expect(r.tiersCreated).toBe(4);
    expect(r.campaignCreated).toBe(true);
    expect(db.tiers.map((t) => t.amount).sort((a, b) => a - b)).toEqual([1000, 2000, 5000, 10000]);
  });

  it("idempotens: másodszorra már nem hoz létre semmit", async () => {
    await ensureShelterDefaults("sh1");
    const second = await ensureShelterDefaults("sh1");

    expect(second.tiersCreated).toBe(0);
    expect(second.campaignCreated).toBe(false);
    expect(db.tiers).toHaveLength(4);
    expect(db.campaigns).toHaveLength(1);
  });

  it("csak a hiányzó csomagot pótolja", async () => {
    db.tiers = [{ id: "meglevo", shelterId: "sh1", amount: 5000, isActive: true }];

    const r = await ensureShelterDefaults("sh1");

    expect(r.tiersCreated).toBe(3);
    expect(db.tiers).toHaveLength(4);
  });

  it("a régi, egyedi összegű csomagot inaktiválja, de NEM törli", async () => {
    db.tiers = [{ id: "regi", shelterId: "sh1", amount: 1500, isActive: true }];

    const r = await ensureShelterDefaults("sh1");

    expect(r.legacyDeactivated).toBe(1);
    // a sor megmarad – a rá előfizetők a Stripe-nál tovább fizetnek
    const legacy = db.tiers.find((t) => t.id === "regi");
    expect(legacy).toBeDefined();
    expect(legacy!.isActive).toBe(false);
  });

  it("az állandó gyűjtés aktív, határidő nélküli és meg van jelölve", async () => {
    await ensureShelterDefaults("sh1");

    const c = db.campaigns[0];
    expect(c.isGeneral).toBe(true);
    expect(c.status).toBe("ACTIVE");
    expect(c.endsAt).toBeNull();
  });

  it("a slug ékezet nélküli és ütközéskor sorszámozódik", async () => {
    db.campaigns.push({
      shelterId: "masik", isGeneral: true, status: "ACTIVE", endsAt: null,
      slug: "altalanos-tamogatas-boldog-tappancs",
    });

    await ensureShelterDefaults("sh1");

    const created = db.campaigns.find((c) => c.shelterId === "sh1")!;
    expect(created.slug).toBe("altalanos-tamogatas-boldog-tappancs-2");
    expect(created.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("nem létező menhelyre nem csinál semmit", async () => {
    db.shelter = null;

    const r = await ensureShelterDefaults("nincs");

    expect(r).toEqual({ tiersCreated: 0, legacyDeactivated: 0, campaignCreated: false });
    expect(db.tiers).toHaveLength(0);
  });

  it("az állandó gyűjtésnek van névleges célösszege (nullával nem osztunk)", () => {
    expect(GENERAL_CAMPAIGN.targetAmount).toBeGreaterThan(0);
  });
});
