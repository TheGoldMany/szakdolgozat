import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  note:          z.string().min(1).max(2000),
  progressLevel: z.number().int().min(0).max(100).optional(),
});

// GET /api/animals/[id]/behavior – viselkedési napló bejegyzések
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const records = await prisma.behaviorLog.findMany({
    where:   { animalId: params.id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(records);
}

// POST /api/animals/[id]/behavior – csak a menhely adminja / önkéntese
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const animal = await prisma.animal.findUnique({
    where:  { id: params.id },
    select: { shelterId: true },
  });
  if (!animal) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: animal.shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const record = await prisma.behaviorLog.create({
    data: {
      animalId:      params.id,
      authorId:      session.user.id,
      note:          parsed.data.note,
      progressLevel: parsed.data.progressLevel,
    },
    include: { author: { select: { name: true } } },
  });

  // Ha a bejegyzés tartalmaz fejlődési szintet, frissítjük az állat aktuális szintjét is
  if (parsed.data.progressLevel !== undefined) {
    await prisma.animal.update({
      where: { id: params.id },
      data:  { progressLevel: parsed.data.progressLevel },
    });
  }

  return NextResponse.json(record, { status: 201 });
}
