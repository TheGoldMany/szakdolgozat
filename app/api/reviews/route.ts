import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

// POST /api/reviews
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

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

  // Menhely értékelés: csak ha volt korábban jóváhagyott kérelme itt
  if (shelterId) {
    const hasAdoption = await prisma.adoptionApplication.findFirst({
      where: {
        userId:   session.user.id,
        status:   "APPROVED",
        animal:   { shelterId },
      },
    });
    if (!hasAdoption) {
      return NextResponse.json(
        { error: "Csak olyan menhelyet értékelhetsz, ahol örökbefogadtál" },
        { status: 403 }
      );
    }
  }

  // Örökbefogadó értékelés: csak shelter admin írhat, és csak olyan usert akitől elfogadtak kérelmet
  if (targetUserId) {
    const myShelterId = await prisma.shelterAdmin.findFirst({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    if (!myShelterId) {
      return NextResponse.json({ error: "Csak menhely adminok értékelhetnek örökbefogadókat" }, { status: 403 });
    }
    const hasAdoption = await prisma.adoptionApplication.findFirst({
      where: {
        userId:  targetUserId,
        status:  "APPROVED",
        animal:  { shelterId: myShelterId.shelterId },
      },
    });
    if (!hasAdoption) {
      return NextResponse.json(
        { error: "Csak olyan örökbefogadót értékelhetsz, aki nálad fogadott örökbe" },
        { status: 403 }
      );
    }
  }

  try {
    const review = await prisma.review.create({
      data: {
        authorId: session.user.id,
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
      return NextResponse.json({ error: "Már értékelted ezt a menhelyet" }, { status: 409 });
    }
    return NextResponse.json({ error: "Szerverhiba" }, { status: 500 });
  }
}
