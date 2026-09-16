import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Ismerős-kapcsolatok.
 *
 * A kényes pontok, amiket védeni kell:
 *
 * • EGY SOR EGY PÁRHOZ. A `pairKey` a két azonosító rendezve, egyedi indexszel.
 *   A naiv `@@unique([requesterId, addresseeId])` csak az „A → B kétszer"
 *   esetet zárná ki, az „A → B és közben B → A" esetet nem.
 * • A kölcsönös jelölés maga az elfogadás: ha a másik már bejelölt, a mi
 *   jelölésünk nem új kérés, hanem igen.
 * • Elfogadni csak a MEGSZÓLÍTOTT tud, és két egyidejű hívásból csak egy nyer –
 *   a feltétel az írás where-jében van, nem előzetes ellenőrzésben.
 */

interface Row {
  id: string; pairKey: string;
  requesterId: string; addresseeId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  respondedAt: Date | null; updatedAt: Date;
}

const db = { rows: [] as Row[], notifications: [] as { userId: string; type: string }[] };
let seq = 0;

function matches(row: Row, where: Record<string, unknown>): boolean {
  if (where.id && row.id !== where.id) return false;
  if (where.pairKey && row.pairKey !== where.pairKey) return false;
  if (where.status && row.status !== where.status) return false;
  if (where.requesterId && row.requesterId !== where.requesterId) return false;
  if (where.addresseeId && row.addresseeId !== where.addresseeId) return false;
  if (Array.isArray(where.OR)) {
    const any = (where.OR as Record<string, unknown>[]).some((c) => matches(row, c));
    if (!any) return false;
  }
  return true;
}

const prismaMock = {
  userConnection: {
    findUnique: async ({ where }: { where: Record<string, unknown> }) =>
      db.rows.find((r) => matches(r, where)) ?? null,
    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      const st = (where.status as { in?: string[] })?.in;
      return db.rows
        .filter((r) => (st ? st.includes(r.status) : true))
        .filter((r) => matches(r, { OR: where.OR }))
        .map((r) => ({
          ...r,
          requester: { id: r.requesterId, name: r.requesterId, image: null, city: null },
          addressee: { id: r.addresseeId, name: r.addresseeId, image: null, city: null },
        }));
    },
    create: async ({ data }: { data: Omit<Row, "id" | "respondedAt" | "updatedAt"> }) => {
      // A valódi adatbázis egyedi indexe – ez a teszt lényege.
      if (db.rows.some((r) => r.pairKey === data.pairKey)) {
        throw Object.assign(new Error("Unique constraint failed on pairKey"), { code: "P2002" });
      }
      const row: Row = { ...data, id: `c${++seq}`, respondedAt: null, updatedAt: new Date() };
      db.rows.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
      const row = db.rows.find((r) => r.id === where.id)!;
      Object.assign(row, data, { updatedAt: new Date() });
      return { ...row };
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => {
      let count = 0;
      for (const row of db.rows) {
        if (!matches(row, where)) continue;
        Object.assign(row, data, { updatedAt: new Date() });
        count++;
      }
      return { count };
    },
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const before = db.rows.length;
      db.rows = db.rows.filter((r) => !matches(r, where));
      return { count: before - db.rows.length };
    },
    count: async ({ where }: { where: Record<string, unknown> }) =>
      db.rows.filter((r) => matches(r, where)).length,
  },
  user: { findUnique: async ({ where }: { where: { id: string } }) => ({ name: where.id }) },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  createNotification: async (n: { userId: string; type: string }) => { db.notifications.push(n); },
}));

const {
  connectionPairKey, connectionState, requestConnection,
  acceptConnection, declineConnection, removeConnection,
  connectionCount, listConnections,
} = await import("@/lib/connections");

beforeEach(() => {
  db.rows = [];
  db.notifications = [];
  seq = 0;
});

describe("connectionPairKey", () => {
  it("ugyanazt adja mindkét sorrendben", () => {
    expect(connectionPairKey("anna", "bela")).toBe(connectionPairKey("bela", "anna"));
  });

  it("rendezett alakot ad", () => {
    expect(connectionPairKey("bela", "anna")).toBe("anna_bela");
  });

  it("különböző párokra különböző kulcsot ad", () => {
    expect(connectionPairKey("a", "b")).not.toBe(connectionPairKey("a", "c"));
  });
});

describe("requestConnection", () => {
  it("első jelölés várakozó sort hoz létre és értesít", async () => {
    const r = await requestConnection("anna", "bela");

    expect(r.outcome).toBe("requested");
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].status).toBe("PENDING");
    expect(db.notifications).toEqual([{ userId: "bela", type: "CONNECTION_REQUEST", title: expect.anything(), body: expect.anything(), href: expect.anything() }]);
  });

  it("ugyanaz a jelölés másodszor nem hoz létre új sort és nem értesít újra", async () => {
    await requestConnection("anna", "bela");
    const r = await requestConnection("anna", "bela");

    expect(r.outcome).toBe("already_pending");
    expect(db.rows).toHaveLength(1);
    expect(db.notifications).toHaveLength(1);
  });

  it("ha a másik már bejelölt minket, a jelölés ELFOGADÁS – egy sorban", async () => {
    await requestConnection("anna", "bela");   // Anna jelöli Bélát
    const r = await requestConnection("bela", "anna"); // Béla visszajelöli

    expect(r.outcome).toBe("accepted");
    expect(db.rows).toHaveLength(1);           // NEM két versengő sor
    expect(db.rows[0].status).toBe("ACCEPTED");
  });

  it("magát senki nem jelölheti be", async () => {
    const r = await requestConnection("anna", "anna");

    expect(r.outcome).toBe("self");
    expect(db.rows).toHaveLength(0);
  });

  it("már meglévő kapcsolatnál nem csinál semmit", async () => {
    await requestConnection("anna", "bela");
    await acceptConnection("bela", db.rows[0].id);
    db.notifications = [];

    const r = await requestConnection("anna", "bela");

    expect(r.outcome).toBe("already_connected");
    expect(db.notifications).toHaveLength(0);
  });

  it("elutasítás után újra lehet jelölni, és az irány átfordul", async () => {
    await requestConnection("anna", "bela");
    await declineConnection("bela", db.rows[0].id);

    const r = await requestConnection("bela", "anna");  // most Béla kezdeményez

    expect(r.outcome).toBe("requested");
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].requesterId).toBe("bela");
    expect(db.rows[0].addresseeId).toBe("anna");
    expect(db.rows[0].status).toBe("PENDING");
  });
});

describe("acceptConnection", () => {
  it("a megszólított elfogadhatja, és a jelölő értesítést kap", async () => {
    await requestConnection("anna", "bela");
    db.notifications = [];

    expect(await acceptConnection("bela", db.rows[0].id)).toBe(true);
    expect(db.rows[0].status).toBe("ACCEPTED");
    expect(db.rows[0].respondedAt).not.toBeNull();
    expect(db.notifications.map((n) => n.userId)).toEqual(["anna"]);
  });

  it("a JELÖLŐ nem fogadhatja el a saját jelölését", async () => {
    await requestConnection("anna", "bela");

    expect(await acceptConnection("anna", db.rows[0].id)).toBe(false);
    expect(db.rows[0].status).toBe("PENDING");
  });

  it("harmadik fél nem fogadhatja el", async () => {
    await requestConnection("anna", "bela");

    expect(await acceptConnection("cecil", db.rows[0].id)).toBe(false);
    expect(db.rows[0].status).toBe("PENDING");
  });

  it("két egyidejű elfogadásból csak egy nyer, és csak egy értesítés megy ki", async () => {
    await requestConnection("anna", "bela");
    db.notifications = [];
    const id = db.rows[0].id;

    const [a, b] = await Promise.all([
      acceptConnection("bela", id),
      acceptConnection("bela", id),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(db.notifications).toHaveLength(1);
  });
});

describe("declineConnection", () => {
  it("a megszólított elutasíthatja", async () => {
    await requestConnection("anna", "bela");

    expect(await declineConnection("bela", db.rows[0].id)).toBe(true);
    expect(db.rows[0].status).toBe("DECLINED");
  });

  it("a jelölő nem utasíthatja el a sajátját", async () => {
    await requestConnection("anna", "bela");

    expect(await declineConnection("anna", db.rows[0].id)).toBe(false);
  });
});

describe("removeConnection", () => {
  it("mindkét fél megszüntetheti a kapcsolatot", async () => {
    await requestConnection("anna", "bela");
    await acceptConnection("bela", db.rows[0].id);

    expect(await removeConnection("anna", db.rows[0].id)).toBe(true);
    expect(db.rows).toHaveLength(0);
  });

  it("a jelölő visszavonhatja a még el nem fogadott jelölését", async () => {
    await requestConnection("anna", "bela");

    expect(await removeConnection("anna", db.rows[0].id)).toBe(true);
    expect(db.rows).toHaveLength(0);
  });

  it("kívülálló nem szüntetheti meg", async () => {
    await requestConnection("anna", "bela");

    expect(await removeConnection("cecil", db.rows[0].id)).toBe(false);
    expect(db.rows).toHaveLength(1);
  });

  it("törlés után újra lehet jelölni", async () => {
    await requestConnection("anna", "bela");
    await removeConnection("anna", db.rows[0].id);

    const r = await requestConnection("anna", "bela");
    expect(r.outcome).toBe("requested");
    expect(db.rows).toHaveLength(1);
  });
});

describe("connectionState", () => {
  it("a két fél ugyanarra a sorra ELLENTÉTES irányt lát", async () => {
    await requestConnection("anna", "bela");

    expect((await connectionState("anna", "bela")).state).toBe("outgoing");
    expect((await connectionState("bela", "anna")).state).toBe("incoming");
  });

  it("elfogadás után mindkettő ismerősnek látja", async () => {
    await requestConnection("anna", "bela");
    await acceptConnection("bela", db.rows[0].id);

    expect((await connectionState("anna", "bela")).state).toBe("connected");
    expect((await connectionState("bela", "anna")).state).toBe("connected");
  });

  it("kapcsolat nélkül none", async () => {
    expect((await connectionState("anna", "bela")).state).toBe("none");
  });

  it("önmagával szemben none", async () => {
    expect((await connectionState("anna", "anna")).state).toBe("none");
  });
});

describe("connectionCount és listConnections", () => {
  it("csak az elfogadottakat számolja", async () => {
    await requestConnection("anna", "bela");
    await acceptConnection("bela", db.rows[0].id);
    await requestConnection("anna", "cecil");   // ez még várakozik

    expect(await connectionCount("anna")).toBe(1);
  });

  it("három listába válogat, a másik felet adva vissza", async () => {
    await requestConnection("anna", "bela");
    await acceptConnection("bela", db.rows[0].id);
    await requestConnection("anna", "cecil");   // Anna küldte
    await requestConnection("dora", "anna");    // Annának érkezett

    const l = await listConnections("anna");

    expect(l.accepted.map((p) => p.id)).toEqual(["bela"]);
    expect(l.outgoing.map((p) => p.id)).toEqual(["cecil"]);
    expect(l.incoming.map((p) => p.id)).toEqual(["dora"]);
  });
});
