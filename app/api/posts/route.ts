import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";
import { slugifyTitle, uniqueArticleSlug, publishedWhere } from "@/lib/articles";
import { cleanTermList } from "@/lib/seo";

const createSchema = z.object({
  title:      z.string().min(3, "A cím legalább 3 karakter legyen").max(200),
  excerpt:    z.string().max(400).optional().or(z.literal("")),
  content:    z.string().min(1, "Írd meg a cikk szövegét"),
  imageUrl:   z.string().url().optional().or(z.literal("")),
  /** Keresőoptimalizálás – mind opcionális, üresen értelmes tartalékot használunk. */
  seoTitle:        z.string().max(120).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  focusKeyword:    z.string().max(80).nullable().optional(),
  keywords:        z.array(z.string()).max(30).optional(),
  tags:            z.array(z.string()).max(30).optional(),

  shelterId:  z.string().optional().nullable(),
  animalId:   z.string().optional().nullable(),
  eventId:    z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  /** Igaz = publikálás, hamis = piszkozat. */
  publish:    z.boolean().optional(),
  /** Jövőbeli időpont = időzített megjelenés. Csak publish=true mellett értelmes. */
  publishedAt: z.string().datetime().nullable().optional(),
});

// Egy cikk listához/előnézethez szükséges mezői + a hivatkozott entitás kivonata.
const postInclude = {
  shelter: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
  author:  { select: { id: true, name: true, image: true } },
  animal:  { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
  event:   { select: { id: true, slug: true, title: true, startsAt: true, location: true } },
  campaign:{ select: { id: true, slug: true, title: true, targetAmount: true, raisedAmount: true } },
  _count:  { select: { likes: true } },
} as const;

// GET /api/posts?cursor=xxx&limit=10 – publikált cikkek (lapozható)
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit  = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 10), 30);

  // Piszkozatot csak a szerkesztő lát, a publikus lista mindig szűr.
  const posts = await prisma.post.findMany({
    where: publishedWhere(),
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { publishedAt: "desc" },
    include: postInclude,
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;

  // A bejelentkezett felhasználó kedvelései a megjelenített cikkekre.
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

// POST /api/posts – új cikk (kizárólag SUPER_ADMIN)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  if (user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cikket csak a platform adminja írhat" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" }, { status: 400 });
  }
  const d = parsed.data;

  // A hivatkozott entitások létezzenek; menhelyhez kötött cikknél egyezzenek is.
  if (d.animalId) {
    const ok = await prisma.animal.findFirst({
      where: { id: d.animalId, ...(d.shelterId ? { shelterId: d.shelterId } : {}) },
      select: { id: true },
    });
    if (!ok) return NextResponse.json({ error: "A megjelölt állat nem található" }, { status: 400 });
  }
  if (d.eventId) {
    const ok = await prisma.event.findFirst({
      where: { id: d.eventId, ...(d.shelterId ? { shelterId: d.shelterId } : {}) },
      select: { id: true },
    });
    if (!ok) return NextResponse.json({ error: "A megjelölt esemény nem található" }, { status: 400 });
  }
  if (d.campaignId) {
    const ok = await prisma.campaign.findFirst({
      where: { id: d.campaignId, ...(d.shelterId ? { shelterId: d.shelterId } : {}) },
      select: { id: true },
    });
    if (!ok) return NextResponse.json({ error: "A megjelölt gyűjtés nem található" }, { status: 400 });
  }

  try {
    const slug = await uniqueArticleSlug(slugifyTitle(d.title));

    const post = await prisma.post.create({
      data: {
        title:       d.title.trim(),
        slug,
        excerpt:     d.excerpt?.trim() || null,
        content:     d.content,
        imageUrl:    d.imageUrl || null,
        seoTitle:        d.seoTitle?.trim() || null,
        metaDescription: d.metaDescription?.trim() || null,
        focusKeyword:    d.focusKeyword?.trim() || null,
        keywords:        cleanTermList(d.keywords),
        tags:            cleanTermList(d.tags),
        shelterId:   d.shelterId || null,
        authorId:    user!.id,
        animalId:    d.animalId || null,
        eventId:     d.eventId || null,
        campaignId:  d.campaignId || null,
        // Piszkozat -> null; időzített -> a megadott (jövőbeli) időpont; egyébként most
        publishedAt:
          d.publish === false
            ? null
            : d.publishedAt
              ? new Date(d.publishedAt)
              : new Date(),
      },
      include: postInclude,
    });

    return NextResponse.json({ post: { ...post, likedByMe: false } }, { status: 201 });
  } catch (err) {
    console.error("[api/posts POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
