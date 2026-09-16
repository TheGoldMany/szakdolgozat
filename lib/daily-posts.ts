import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/**
 * Napi állatok – rövid életű képfolyam.
 *
 * A kép 24 óra után kiesik a feedből, de a sor NEM törlődik: a szerző a saját
 * profilján naptárban visszanézheti a korábbi napjait. A „napi" jelleg tehát a
 * lekérdezésben él, nem takarításban — így a visszanézés nem igényel külön
 * archívumot, és nincs olyan éjféli feladat, ami elronthat valamit.
 */
export const DAILY_FEED_HOURS = 24;

/** A feed alsó időhatára: ennél régebbi kép már nem látszik. */
export function feedSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - DAILY_FEED_HOURS * 60 * 60 * 1000);
}

export type FeedTab = "friends" | "recommended" | "trending";

export interface DailyPostView {
  id:        string;
  imageUrl:  string;
  caption:   string | null;
  createdAt: Date;
  author:    { id: string; name: string | null; image: string | null };
  animal:    { id: string; name: string; slug: string } | null;
  likeCount: number;
  likedByMe: boolean;
}

const POST_SELECT = {
  id: true, imageUrl: true, caption: true, createdAt: true,
  author: { select: { id: true, name: true, image: true } },
  animal: { select: { id: true, name: true, slug: true } },
  _count: { select: { likes: true } },
} as const;

type RawPost = {
  id: string; imageUrl: string; caption: string | null; createdAt: Date;
  author: { id: string; name: string | null; image: string | null };
  animal: { id: string; name: string; slug: string } | null;
  _count: { likes: number };
};

/** Kik az elfogadott ismerőseim? */
async function acceptedConnectionIds(userId: string): Promise<string[]> {
  const rows = await prisma.userConnection.findMany({
    where:  { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

/**
 * Egy adag kép a kért fülről.
 *
 * A `likedByMe` jelzést külön kérdéssel töltjük fel, nem találatonként: egy
 * `in` lekérdezés az összes visszaadott képre, ahelyett hogy minden képnél
 * külön megkérdeznénk.
 */
async function decorate(posts: RawPost[], viewerId: string): Promise<DailyPostView[]> {
  if (posts.length === 0) return [];

  const liked = await prisma.dailyPostLike.findMany({
    where:  { userId: viewerId, postId: { in: posts.map((p) => p.id) } },
    select: { postId: true },
  });
  const likedSet = new Set(liked.map((l) => l.postId));

  return posts.map((p) => ({
    id: p.id, imageUrl: p.imageUrl, caption: p.caption, createdAt: p.createdAt,
    author: p.author, animal: p.animal,
    likeCount: p._count.likes,
    likedByMe: likedSet.has(p.id),
  }));
}

export async function dailyFeed(
  viewerId: string, tab: FeedTab, limit = 30,
): Promise<DailyPostView[]> {
  const since = feedSince();

  if (tab === "friends") {
    const friends = await acceptedConnectionIds(viewerId);
    // A sajátunk is ide tartozik: a saját mai képünket lássuk elöl.
    const authors = [...friends, viewerId];
    const posts = await prisma.dailyPost.findMany({
      where:   { createdAt: { gte: since }, authorId: { in: authors } },
      select:  POST_SELECT,
      orderBy: { createdAt: "desc" },
      take:    limit,
    });
    return decorate(posts, viewerId);
  }

  if (tab === "trending") {
    // „Felkapott": ugyanaz a 24 órás ablak, de kedvelés szerint rendezve.
    // A holtversenyt az újabb kép nyeri, hogy ne fagyjon be a sorrend.
    const posts = await prisma.dailyPost.findMany({
      where:   { createdAt: { gte: since } },
      select:  POST_SELECT,
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      take:    limit,
    });
    return decorate(posts, viewerId);
  }

  // „Ajánlott": akit még nem ismer. Szándékosan nem ismétli az ismerősök
  // fülét — az már megvolt, itt a felfedezés a cél.
  const friends = await acceptedConnectionIds(viewerId);
  const posts = await prisma.dailyPost.findMany({
    where: {
      createdAt: { gte: since },
      authorId:  { notIn: [...friends, viewerId] },
    },
    select:  POST_SELECT,
    orderBy: { createdAt: "desc" },
    take:    limit,
  });
  return decorate(posts, viewerId);
}

/** Új napi kép. */
export async function createDailyPost(input: {
  authorId: string;
  imageUrl: string;
  caption?: string | null;
  animalId?: string | null;
}): Promise<{ id: string }> {
  return prisma.dailyPost.create({
    data: {
      authorId: input.authorId,
      imageUrl: input.imageUrl,
      caption:  input.caption?.trim() || null,
      animalId: input.animalId || null,
    },
    select: { id: true },
  });
}

/**
 * Kedvelés be/ki.
 *
 * A törlés `deleteMany`, a létrehozás `createMany` + `skipDuplicates`: így két
 * egyidejű kattintás sem dob hibát, és nem keletkezik két kedvelés. A
 * visszaadott `liked` mindig a MŰVELET UTÁNI állapot, hogy a felület ne
 * találgasson.
 */
export async function toggleLike(
  postId: string, userId: string,
): Promise<{ liked: boolean; likeCount: number } | null> {
  const post = await prisma.dailyPost.findUnique({
    where:  { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return null;

  const existing = await prisma.dailyPostLike.findUnique({
    where:  { postId_userId: { postId, userId } },
    select: { id: true },
  });

  let liked: boolean;
  if (existing) {
    await prisma.dailyPostLike.deleteMany({ where: { postId, userId } });
    liked = false;
  } else {
    const created = await prisma.dailyPostLike.createMany({
      data:           [{ postId, userId }],
      skipDuplicates: true,
    });
    liked = true;
    // Csak az ELSŐ kedveléskor értesítünk, és sosem magunkat.
    if (created.count > 0 && post.authorId !== userId) {
      await notifyLike(post.authorId, userId).catch(() => {});
    }
  }

  const likeCount = await prisma.dailyPostLike.count({ where: { postId } });
  return { liked, likeCount };
}

async function notifyLike(authorId: string, likerId: string): Promise<void> {
  const liker = await prisma.user.findUnique({
    where: { id: likerId }, select: { name: true },
  });
  await createNotification({
    userId: authorId,
    type:   "DAILY_POST_LIKED",
    title:  "Kedvelték a napi képedet",
    body:   `${liker?.name ?? "Valaki"} kedvelte a mai képedet.`,
    href:   "/profile/napi",
  });
}

export interface CalendarDay {
  /** `YYYY-MM-DD` helyi idő szerint. */
  date:     string;
  postId:   string;
  imageUrl: string;
  caption:  string | null;
  /** Ha egy napon több kép is volt, ennyi. */
  count:    number;
}

/**
 * A szerző saját képei egy adott hónapban, naptárhoz.
 *
 * A napokra bontás a SZERVEREN történik, `Intl`-lel, a kért időzónában. Ha a
 * kliens csoportosítana, akkor két ember ugyanazt a képet más naphoz sorolná,
 * és a naptár nem stimmelne a „mikor töltöttem fel" emlékkel.
 *
 * Egy napon több kép is lehet (nincs napi korlát); ilyenkor a nap a legutolsót
 * mutatja, és a `count` jelzi, hogy van több.
 */
export async function calendarMonth(
  userId: string, year: number, month: number, timeZone = "Europe/Budapest",
): Promise<CalendarDay[]> {
  // A hónap határait a megadott időzóna szerint akarjuk, de a tárolt idő UTC.
  // Egy nap ráhagyás mindkét végen: a szélső napok így nem esnek ki, a
  // csoportosítás pedig utána kiszűri, ami nem ebbe a hónapba tartozik.
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to   = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  from.setUTCDate(from.getUTCDate() - 1);
  to.setUTCDate(to.getUTCDate() + 1);

  const posts = await prisma.dailyPost.findMany({
    where:   { authorId: userId, createdAt: { gte: from, lt: to } },
    select:  { id: true, imageUrl: true, caption: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  });
  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  const byDay = new Map<string, CalendarDay>();
  for (const p of posts) {
    const date = fmt.format(p.createdAt);      // en-CA → YYYY-MM-DD
    if (!date.startsWith(prefix)) continue;    // a ráhagyás miatt kilógó napok
    const prev = byDay.get(date);
    byDay.set(date, {
      date,
      postId:   p.id,
      imageUrl: p.imageUrl,
      caption:  p.caption,
      count:    (prev?.count ?? 0) + 1,
    });
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
