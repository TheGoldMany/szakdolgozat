import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  shelterId:    z.string().optional(),
  targetUserId: z.string().optional(),
  rating:       z.number().int().min(1).max(5),
  comment:      z.string().max(1000).optional(),
});

// GET /api/reviews?shelterId=xxx  vagy  ?targetUserId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const shelterId    = searchParams.get("shelterId");
  const targetUserId = searchParams.get("targetUserId");

  const reviews = await prisma.review.findMany({
    where: {
      ...(shelterId    && { shelterId }),
      ...(targetUserId && { targetUserId }),
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return NextResponse.json({ reviews, avg, count: reviews.length });
}

// POST /api/reviews – bármely bejelentkezett user értékelhet bárkit (Uber-modell)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { shelterId, targetUserId, rating, comment } = parsed.data;

  if (!shelterId && !targetUserId) {
    return NextResponse.json({ error: "Adj meg értékelt menhelyet vagy felhasználót" }, { status: 400 });
  }
  if (shelterId && targetUserId) {
    return NextResponse.json({ error: "Egyszerre csak egyet értékelhetsz" }, { status: 400 });
  }

  // Önértékelés tiltása
  if (targetUserId === user!.id) {
    return NextResponse.json({ error: "Saját magadat nem értékelheted" }, { status: 400 });
  }

  try {
    const review = await prisma.review.create({
      data: {
        authorId:     user!.id,
        shelterId:    shelterId    ?? null,
        targetUserId: targetUserId ?? null,
        rating,
        comment: comment ?? null,
      },
      include: { author: { select: { id: true, name: true, image: true } } },
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Már értékelted ezt a személyt" }, { status: 409 });
    }
    return NextResponse.json({ error: "Szerverhiba" }, { status: 500 });
  }
}
