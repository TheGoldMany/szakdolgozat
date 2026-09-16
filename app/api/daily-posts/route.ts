import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createDailyPost, dailyFeed, type FeedTab } from "@/lib/daily-posts";

const TABS: FeedTab[] = ["friends", "recommended", "trending"];

/**
 * GET /api/daily-posts?tab=friends|recommended|trending
 *
 * A két „felfedező" fül csak akkor szolgál ki, ha a felhasználó beleegyezett,
 * hogy az ismerősi körén kívülről is lásson képeket. A kapu a SZERVEREN van,
 * nem a felületen: enélkül a végpont közvetlen hívásával meg lehetne kerülni.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  const raw = req.nextUrl.searchParams.get("tab") ?? "friends";
  const tab = (TABS as string[]).includes(raw) ? (raw as FeedTab) : "friends";

  const me = await prisma.user.findUnique({
    where:  { id: user!.id },
    select: { dailyIntroSeen: true, dailyFeedExpanded: true },
  });

  if (tab !== "friends" && !me?.dailyFeedExpanded) {
    return NextResponse.json({ posts: [], needsConsent: true }, { status: 200 });
  }

  return NextResponse.json({
    posts:        await dailyFeed(user!.id, tab),
    introSeen:    me?.dailyIntroSeen    ?? false,
    feedExpanded: me?.dailyFeedExpanded ?? false,
  });
}

const createSchema = z.object({
  imageUrl: z.string().url().max(2000),
  caption:  z.string().max(500).optional().nullable(),
  animalId: z.string().optional().nullable(),
});

/** POST /api/daily-posts – új napi kép. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  // A kép mindenki feedjében megjelenhet, ezért a feltöltés ütemét fogjuk.
  if (!checkRateLimit(`daily-post:${user!.id}`, 10, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Egy órán belül túl sok képet töltöttél fel. Próbáld később." },
      { status: 429 },
    );
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  // Állathoz kötés csak létező állatra; egyébként inkább kötés nélkül mentünk,
  // mint hogy elvesszen a kép egy elavult azonosító miatt.
  let animalId: string | null = null;
  if (parsed.data.animalId) {
    const animal = await prisma.animal.findUnique({
      where: { id: parsed.data.animalId }, select: { id: true },
    });
    animalId = animal?.id ?? null;
  }

  const post = await createDailyPost({
    authorId: user!.id,
    imageUrl: parsed.data.imageUrl,
    caption:  parsed.data.caption,
    animalId,
  });
  return NextResponse.json(post, { status: 201 });
}
