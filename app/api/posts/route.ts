import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";

const createSchema = z.object({
  shelterId:  z.string().min(1),
  content:    z.string().min(1, "Írj valamit").max(2000),
  imageUrl:   z.string().url().optional().or(z.literal("")),
  animalId:   z.string().optional().nullable(),
  eventId:    z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
});

// Egy poszt feed-előnézethez szükséges mezői + a hivatkozott entitás kivonata.
const postInclude = {
  shelter: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
  author:  { select: { id: true, name: true, image: true } },
  animal:  { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
  event:   { select: { id: true, slug: true, title: true, startsAt: true, location: true } },
  campaign:{ select: { id: true, slug: true, title: true, targetAmount: true, raisedAmount: true } },
  _count:  { select: { likes: true } },
} as const;

// GET /api/posts?cursor=xxx&limit=10 – publikus feed (lapozható)
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit  = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);

  const posts = await prisma.post.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: postInclude,
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  // A bejelentkezett felhasználó kedvelései a megjelenített posztokra.
  let likedIds = new Set<string>();
  if (authUser && page.length) {
    const likes = await prisma.postLike.findMany({
      where:  { userId: authUser.id, postId: { in: page.map((p) => p.id) } },
      select: { postId: true },
    });
    likedIds = new Set(likes.map((l) => l.postId));
  }

  return NextResponse.json({
    posts:      page.map((p) => ({ ...p, likedByMe: likedIds.has(p.id) })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}

// POST /api/posts – menhely-admin új posztot ír
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" }, { status: 400 });
  }
  const d = parsed.data;

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: user!.id, shelterId: d.shelterId },
  });
  if (!isAdmin && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  // A hivatkozott entitások biztosan ehhez a menhelyhez tartozzanak.
  if (d.animalId) {
    const ok = await prisma.animal.findFirst({ where: { id: d.animalId, shelterId: d.shelterId }, select: { id: true } });
    if (!ok) return NextResponse.json({ error: "Az állat nem ehhez a menhelyhez tartozik" }, { status: 400 });
  }
  if (d.eventId) {
    const ok = await prisma.event.findFirst({ where: { id: d.eventId, shelterId: d.shelterId }, select: { id: true } });
    if (!ok) return NextResponse.json({ error: "Az esemény nem ehhez a menhelyhez tartozik" }, { status: 400 });
  }
  if (d.campaignId) {
    const ok = await prisma.campaign.findFirst({ where: { id: d.campaignId, shelterId: d.shelterId }, select: { id: true } });
    if (!ok) return NextResponse.json({ error: "A gyűjtés nem ehhez a menhelyhez tartozik" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: {
      shelterId:  d.shelterId,
      authorId:   user!.id,
      content:    d.content,
      imageUrl:   d.imageUrl || null,
      animalId:   d.animalId || null,
      eventId:    d.eventId || null,
      campaignId: d.campaignId || null,
    },
    include: postInclude,
  });

  return NextResponse.json({ post: { ...post, likedByMe: false } }, { status: 201 });
}
