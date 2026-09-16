import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Napi állatok.
 *
 * A védendő pontok:
 *
 * • A 24 ÓRÁS ABLAK a lekérdezésben él, nem takarításban. A sor megmarad, mert
 *   a szerző naptárban visszanézheti — ha törölnénk, a visszanézés üres lenne.
 * • Az „ajánlott" fül SZÁNDÉKOSAN kizárja az ismerősöket és magunkat: az
 *   ismerősök füle már megvolt, itt a felfedezés a cél.
 * • A naptár napokra bontása a SZERVEREN, a megjelenítés időzónájában történik.
 *   Kliensoldalon két ember ugyanazt a képet más naphoz sorolná.
 * • A kedvelés be/ki idempotens: két egyidejű kattintás sem hoz létre két
 *   kedvelést, és a visszaadott állapot mindig a művelet UTÁNI.
 */

interface Post {
  id: string; authorId: string; imageUrl: string; caption: string | null; createdAt: Date;
}
interface Like { postId: string; userId: string }

const db = {
  posts: [] as Post[],
  likes: [] as Like[],
  connections: [] as { requesterId: string; addresseeId: string; status: string }[],
  notifications: [] as { userId: string; type: string }[],
};

function inWindow(p: Post, where: Record<string, any>): boolean {
  const gte = where.createdAt?.gte as Date | undefined;
  const lt  = where.createdAt?.lt  as Date | undefined;
  if (gte && p.createdAt < gte) return false;
  if (lt  && p.createdAt >= lt)  return false;
  if (where.authorId?.in    && !where.authorId.in.includes(p.authorId))   return false;
  if (where.authorId?.notIn &&  where.authorId.notIn.includes(p.authorId)) return false;
  if (typeof where.authorId === "string" && p.authorId !== where.authorId) return false;
  return true;
}

const likeCount = (postId: string) => db.likes.filter((l) => l.postId === postId).length;

const prismaMock = {
  dailyPost: {
    findMany: async ({ where, orderBy, take }: any) => {
      let rows = db.posts.filter((p) => inWindow(p, where ?? {}));
      const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
      rows = [...rows].sort((a, b) => {
        for (const o of orders) {
          if (!o) continue;
          if (o.likes?._count) {
            const d = likeCount(b.id) - likeCount(a.id);
            if (d !== 0) return o.likes._count === "desc" ? d : -d;
          }
          if (o.createdAt) {
            const d = b.createdAt.getTime() - a.createdAt.getTime();
            if (d !== 0) return o.createdAt === "desc" ? d : -d;
          }
        }
        return 0;
      });
      return rows.slice(0, take ?? rows.length).map((p) => ({
        id: p.id, imageUrl: p.imageUrl, caption: p.caption, createdAt: p.createdAt,
        author: { id: p.authorId, name: p.authorId, image: null },
        animal: null,
        _count: { likes: likeCount(p.id) },
      }));
    },
    findUnique: async ({ where }: any) => {
      const p = db.posts.find((x) => x.id === where.id);
      return p ? { id: p.id, authorId: p.authorId } : null;
    },
    create: async ({ data }: any) => {
      const row: Post = {
        id: `p${db.posts.length + 1}`, authorId: data.authorId,
        imageUrl: data.imageUrl, caption: data.caption ?? null, createdAt: new Date(),
      };
      db.posts.push(row);
      return { id: row.id };
    },
  },
  dailyPostLike: {
    findMany: async ({ where }: any) =>
      db.likes.filter((l) => l.userId === where.userId && where.postId.in.includes(l.postId))
        .map((l) => ({ postId: l.postId })),
    findUnique: async ({ where }: any) => {
      const { postId, userId } = where.postId_userId;
      const hit = db.likes.find((l) => l.postId === postId && l.userId === userId);
      return hit ? { id: `${postId}:${userId}` } : null;
    },
    createMany: async ({ data }: any) => {
      let count = 0;
      for (const row of data) {
        if (db.likes.some((l) => l.postId === row.postId && l.userId === row.userId)) continue;
        db.likes.push(row); count++;
      }
      return { count };
    },
    deleteMany: async ({ where }: any) => {
      const before = db.likes.length;
      db.likes = db.likes.filter((l) => !(l.postId === where.postId && l.userId === where.userId));
      return { count: before - db.likes.length };
    },
    count: async ({ where }: any) => likeCount(where.postId),
  },
  userConnection: {
    findMany: async ({ where }: any) =>
      db.connections.filter((c) =>
        c.status === where.status &&
        (c.requesterId === where.OR[0].requesterId || c.addresseeId === where.OR[1].addresseeId)),
  },
  user: { findUnique: async ({ where }: any) => ({ name: where.id }) },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  createNotification: async (n: { userId: string; type: string }) => { db.notifications.push(n); },
}));

const { dailyFeed, createDailyPost, toggleLike, calendarMonth, feedSince, DAILY_FEED_HOURS } =
  await import("@/lib/daily-posts");

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

beforeEach(() => {
  db.posts = [];
  db.likes = [];
  db.connections = [];
  db.notifications = [];
});

describe("a 24 órás ablak", () => {
  it("pontosan 24 óra", () => {
    expect(DAILY_FEED_HOURS).toBe(24);
  });

  it("a határ 24 órával ezelőtt van", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    expect(feedSince(now).toISOString()).toBe("2026-05-09T12:00:00.000Z");
  });

  it("a 23 órás kép még látszik, a 25 órás már nem", async () => {
    db.connections = [{ requesterId: "en", addresseeId: "barat", status: "ACCEPTED" }];
    db.posts = [
      { id: "friss", authorId: "barat", imageUrl: "a", caption: null, createdAt: hoursAgo(23) },
      { id: "regi",  authorId: "barat", imageUrl: "b", caption: null, createdAt: hoursAgo(25) },
    ];

    const feed = await dailyFeed("en", "friends");

    expect(feed.map((p) => p.id)).toEqual(["friss"]);
  });

  it("a lejárt kép SORA megmarad – a naptár ebből él", async () => {
    db.posts = [{ id: "regi", authorId: "en", imageUrl: "b", caption: null, createdAt: hoursAgo(48) }];

    await dailyFeed("en", "friends");

    expect(db.posts).toHaveLength(1);   // nem töröltük
  });
});

describe("az ismerősök füle", () => {
  it("az ismerősök és a SAJÁT képeket adja", async () => {
    db.connections = [{ requesterId: "en", addresseeId: "barat", status: "ACCEPTED" }];
    db.posts = [
      { id: "1", authorId: "barat",   imageUrl: "a", caption: null, createdAt: hoursAgo(1) },
      { id: "2", authorId: "en",      imageUrl: "b", caption: null, createdAt: hoursAgo(2) },
      { id: "3", authorId: "idegen",  imageUrl: "c", caption: null, createdAt: hoursAgo(3) },
    ];

    const feed = await dailyFeed("en", "friends");

    expect(feed.map((p) => p.id).sort()).toEqual(["1", "2"]);
  });

  it("a várakozó jelölés még nem ismerős", async () => {
    db.connections = [{ requesterId: "en", addresseeId: "talan", status: "PENDING" }];
    db.posts = [{ id: "1", authorId: "talan", imageUrl: "a", caption: null, createdAt: hoursAgo(1) }];

    expect(await dailyFeed("en", "friends")).toHaveLength(0);
  });
});

describe("az ajánlott fül", () => {
  it("kizárja az ismerősöket és magunkat", async () => {
    db.connections = [{ requesterId: "en", addresseeId: "barat", status: "ACCEPTED" }];
    db.posts = [
      { id: "1", authorId: "barat",  imageUrl: "a", caption: null, createdAt: hoursAgo(1) },
      { id: "2", authorId: "en",     imageUrl: "b", caption: null, createdAt: hoursAgo(2) },
      { id: "3", authorId: "idegen", imageUrl: "c", caption: null, createdAt: hoursAgo(3) },
    ];

    const feed = await dailyFeed("en", "recommended");

    expect(feed.map((p) => p.id)).toEqual(["3"]);
  });
});

describe("a felkapott fül", () => {
  it("kedvelés szerint rendez, holtversenynél az újabb nyer", async () => {
    db.posts = [
      { id: "keves", authorId: "a", imageUrl: "1", caption: null, createdAt: hoursAgo(5) },
      { id: "sok",   authorId: "b", imageUrl: "2", caption: null, createdAt: hoursAgo(4) },
      { id: "ujabb", authorId: "c", imageUrl: "3", caption: null, createdAt: hoursAgo(1) },
    ];
    db.likes = [
      { postId: "sok", userId: "x" }, { postId: "sok", userId: "y" },
      { postId: "keves", userId: "x" }, { postId: "ujabb", userId: "y" },
    ];

    const feed = await dailyFeed("en", "trending");

    expect(feed[0].id).toBe("sok");           // 2 kedvelés
    expect(feed[1].id).toBe("ujabb");         // 1 kedvelés, de újabb
    expect(feed[2].id).toBe("keves");
  });

  it("a saját kedvelést jelzi", async () => {
    db.posts = [{ id: "1", authorId: "a", imageUrl: "x", caption: null, createdAt: hoursAgo(1) }];
    db.likes = [{ postId: "1", userId: "en" }];

    const feed = await dailyFeed("en", "trending");

    expect(feed[0].likedByMe).toBe(true);
    expect(feed[0].likeCount).toBe(1);
  });
});

describe("toggleLike", () => {
  beforeEach(() => {
    db.posts = [{ id: "p1", authorId: "szerzo", imageUrl: "x", caption: null, createdAt: new Date() }];
  });

  it("első kattintás kedvel és értesíti a szerzőt", async () => {
    const r = await toggleLike("p1", "en");

    expect(r).toEqual({ liked: true, likeCount: 1 });
    expect(db.notifications).toEqual([{ userId: "szerzo", type: "DAILY_POST_LIKED", title: expect.anything(), body: expect.anything(), href: expect.anything() }]);
  });

  it("második kattintás visszavonja, és nem értesít újra", async () => {
    await toggleLike("p1", "en");
    db.notifications = [];
    const r = await toggleLike("p1", "en");

    expect(r).toEqual({ liked: false, likeCount: 0 });
    expect(db.notifications).toHaveLength(0);
  });

  it("a saját képünk kedvelése nem küld értesítést magunknak", async () => {
    await toggleLike("p1", "szerzo");

    expect(db.notifications).toHaveLength(0);
  });

  it("két egyidejű kedvelés nem hoz létre kettőt", async () => {
    await Promise.all([toggleLike("p1", "en"), toggleLike("p1", "en")]);

    expect(db.likes.filter((l) => l.postId === "p1" && l.userId === "en").length).toBeLessThanOrEqual(1);
  });

  it("nem létező képre null", async () => {
    expect(await toggleLike("nincs", "en")).toBeNull();
  });
});

describe("calendarMonth", () => {
  it("napokra bont, és egy napon több képnél a darabszámot jelzi", async () => {
    db.posts = [
      { id: "a", authorId: "en", imageUrl: "1", caption: "reggel", createdAt: new Date("2026-05-04T08:00:00Z") },
      { id: "b", authorId: "en", imageUrl: "2", caption: "este",   createdAt: new Date("2026-05-04T18:00:00Z") },
      { id: "c", authorId: "en", imageUrl: "3", caption: null,     createdAt: new Date("2026-05-07T10:00:00Z") },
    ];

    const days = await calendarMonth("en", 2026, 5, "Europe/Budapest");

    expect(days.map((d) => d.date)).toEqual(["2026-05-04", "2026-05-07"]);
    expect(days[0].count).toBe(2);
    expect(days[0].caption).toBe("este");   // a nap utolsó képe látszik
    expect(days[1].count).toBe(1);
  });

  it("a szomszédos hónap képeit kiszűri", async () => {
    db.posts = [
      { id: "elozo", authorId: "en", imageUrl: "1", caption: null, createdAt: new Date("2026-04-30T12:00:00Z") },
      { id: "benne", authorId: "en", imageUrl: "2", caption: null, createdAt: new Date("2026-05-01T12:00:00Z") },
      { id: "kovet", authorId: "en", imageUrl: "3", caption: null, createdAt: new Date("2026-06-01T12:00:00Z") },
    ];

    const days = await calendarMonth("en", 2026, 5, "Europe/Budapest");

    expect(days.map((d) => d.date)).toEqual(["2026-05-01"]);
  });

  it("az időzóna eldöntheti, melyik NAPHOZ tartozik a kép", async () => {
    // 2026-05-04 22:30 UTC = Budapesten már május 5. 00:30
    db.posts = [{ id: "ejfel", authorId: "en", imageUrl: "1", caption: null, createdAt: new Date("2026-05-04T22:30:00Z") }];

    const bp  = await calendarMonth("en", 2026, 5, "Europe/Budapest");
    const utc = await calendarMonth("en", 2026, 5, "UTC");

    expect(bp[0].date).toBe("2026-05-05");
    expect(utc[0].date).toBe("2026-05-04");
  });

  it("üres hónapra üres lista", async () => {
    expect(await calendarMonth("en", 2026, 5)).toEqual([]);
  });
});

describe("createDailyPost", () => {
  it("levágja a felesleges szóközt, és üres feliratot null-ra tesz", async () => {
    await createDailyPost({ authorId: "en", imageUrl: "x", caption: "   " });
    expect(db.posts[0].caption).toBeNull();

    await createDailyPost({ authorId: "en", imageUrl: "y", caption: "  szia  " });
    expect(db.posts[1].caption).toBe("szia");
  });
});
