import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Az adminnapló írása a válasz után is lefusson.
 *
 * A HIBA, AMIT EZ VÉD: a bejegyzést egy el nem várt ígéret írta. A szerverless
 * függvény a válasz után leállhatott, és a sor elveszett, ezért a napló csak
 * néha kapta meg a műveleteket. Most `after()` jelzi a platformnak a munkát.
 */

const created: Record<string, unknown>[] = [];
const scheduled: (() => unknown)[] = [];
let inRequest = true;

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => {
    if (!inRequest) throw new Error("`after` was called outside a request scope");
    scheduled.push(fn);
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return data; } } },
}));

const { logAudit } = await import("@/lib/audit");

beforeEach(() => { created.length = 0; scheduled.length = 0; inRequest = true; });

describe("logAudit", () => {
  it("kérésen belül `after()`-rel ütemezi az írást", async () => {
    logAudit({ actorId: "a1", action: "VET_DELETED", targetType: "VetClinic", targetId: "v1", targetName: "Teszt" });
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(created[0]).toMatchObject({ actorId: "a1", action: "VET_DELETED", targetId: "v1" });
  });

  it("kérésen kívül is beír, és ütemező nélkül (null) is elfogadja", async () => {
    inRequest = false;
    logAudit({ actorId: null, action: "ETL_RUN", targetType: "DataWarehouse", targetId: "etl" });
    await new Promise((r) => setTimeout(r, 0));
    expect(created[0]).toMatchObject({ actorId: null, action: "ETL_RUN" });
  });
});
