import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KennelType } from "@prisma/client";

const schema = z.object({
  name:     z.string().min(1).max(100),
  type:     z.nativeEnum(KennelType),
  capacity: z.number().int().min(1).max(1000),
  note:     z.string().max(2000).optional(),
  isCovered:   z.boolean().optional(),
  isFenced:    z.boolean().optional(),
  hasFeeder:   z.boolean().optional(),
  hasWaterer:  z.boolean().optional(),
  hasHouse:    z.boolean().optional(),
  hasBedding:  z.boolean().optional(),
  hasHeating:  z.boolean().optional(),
  hasLighting: z.boolean().optional(),
  hasDrainage: z.boolean().optional(),
  hasToys:     z.boolean().optional(),
});

/** A bejelentkezett user menhelyét adja vissza (SHELTER_ADMIN), vagy a query-ben kértet (SUPER_ADMIN). */
async function resolveShelterId(userId: string, role: string | undefined, requested?: string | null) {
  if (role === "SUPER_ADMIN") {
    if (requested) return requested;
    const first = await prisma.shelter.findFirst({ select: { id: true } });
    return first?.id;
  }
  const admin = await prisma.shelterAdmin.findFirst({ where: { userId }, select: { shelterId: true } });
  return admin?.shelterId;
}

// GET /api/kennels – kennelek listája foglaltsággal
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const requested = req.nextUrl.searchParams.get("shelterId");
    const shelterId = await resolveShelterId(session.user.id, session.user.role, requested);
    if (!shelterId) return NextResponse.json([]);

    const kennels = await prisma.kennel.findMany({
      where:   { shelterId },
      include: { _count: { select: { animals: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(kennels);
  } catch (error) {
    console.error('[api/kennels GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/kennels – új férőhely létrehozása
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

  try {
    const requested = (body?.shelterId as string | undefined) ?? null;
    const shelterId = await resolveShelterId(session.user.id, session.user.role, requested);
    if (!shelterId) return NextResponse.json({ error: "Nincs menhely" }, { status: 400 });

    // Jogosultság ellenőrzés (SHELTER_ADMIN csak a sajátját)
    if (session.user.role !== "SUPER_ADMIN") {
      const admin = await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id, shelterId } });
      if (!admin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const kennel = await prisma.kennel.create({
      data: { shelterId, ...parsed.data },
      include: { _count: { select: { animals: true } } },
    });
    return NextResponse.json(kennel, { status: 201 });
  } catch (error) {
    console.error('[api/kennels POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
