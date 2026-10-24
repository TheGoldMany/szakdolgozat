import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Bejelentések kezelése a platform szintjén.
 *
 * Amit véd: csak a főadmin szerkeszthet és törölhet bármely bejelentést, és
 * mindkét művelet nyomot hagy az adminnaplóban.
 */

let role = "SUPER_ADMIN";
const audits: { action: string; targetId: string; reason?: string | null }[] = [];
const updates: Record<string, unknown>[] = [];
const deletes: string[] = [];
const existing = { id: "r1", name: "Mazsi", city: "Lajosmizse", address: "Bene szél utca" };

vi.mock("next-auth/next", () => ({ getServerSession: async () => ({ user: { id: "admin1", role } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ logAudit: (a: { action: string; targetId: string; reason?: string | null }) => audits.push(a) }));
vi.mock("@/lib/geo", () => ({ geocodeAddress: async () => ({ lat: 47.016, lng: 19.556 }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    animalReport: {
      findUnique: async ({ where }: { where: { id: string } }) => (where.id === "r1" ? existing : null),
      update: async ({ data }: { data: Record<string, unknown> }) => { updates.push(data); return { ...existing, ...data }; },
      delete: async ({ where }: { where: { id: string } }) => { deletes.push(where.id); },
    },
  },
}));

const { PATCH, DELETE } = await import("@/app/api/admin/reports/[id]/route");
const params = (id = "r1") => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown, qs = "") =>
  new NextRequest(`http://localhost/api/admin/reports/r1${qs}`, { method, ...(body && { body: JSON.stringify(body) }) });

beforeEach(() => { role = "SUPER_ADMIN"; audits.length = 0; updates.length = 0; deletes.length = 0; });

describe("/api/admin/reports/[id]", () => {
  it("menhelyi admin nem szerkeszthet és nem törölhet", async () => {
    role = "SHELTER_ADMIN";
    expect((await PATCH(req("PATCH", { name: "x" }), params())).status).toBe(403);
    expect((await DELETE(req("DELETE"), params())).status).toBe(403);
    expect(updates).toHaveLength(0);
    expect(deletes).toHaveLength(0);
  });

  it("szerkesztés: menti a mezőket, kérésre újrakeresi a helyet, naplóz", async () => {
    const res = await PATCH(req("PATCH", { address: "Beneszél utca", regeocode: true }), params());
    expect(res.status).toBe(200);
    expect(updates[0]).toEqual({ address: "Beneszél utca", lat: 47.016, lng: 19.556 });
    expect(audits[0]).toMatchObject({ action: "REPORT_EDITED", targetId: "r1" });
  });

  it("törlés: töröl és az indokkal együtt naplóz", async () => {
    const res = await DELETE(req("DELETE", undefined, "?reason=spam"), params());
    expect(res.status).toBe(200);
    expect(deletes).toEqual(["r1"]);
    expect(audits[0]).toMatchObject({ action: "REPORT_DELETED", targetId: "r1", reason: "spam" });
  });

  it("nem létező bejelentésre 404", async () => {
    expect((await DELETE(req("DELETE"), params("nincs"))).status).toBe(404);
  });
});
