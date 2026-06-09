import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/favorites – the current user's favorited animal IDs
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ animalIds: [] });
  }

  const favorites = await prisma.favorite.findMany({
    where:  { userId: session.user.id },
    select: { animalId: true },
  });

  return NextResponse.json({ animalIds: favorites.map((f) => f.animalId) });
}

// POST /api/favorites – add an animal to favorites
const schema = z.object({ animalId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Hibás adat" }, { status: 400 });
  }

  const animal = await prisma.animal.findUnique({
    where:  { id: parsed.data.animalId },
    select: { id: true },
  });
  if (!animal) {
    return NextResponse.json({ error: "Az állat nem található" }, { status: 404 });
  }

  await prisma.favorite.upsert({
    where:  { userId_animalId: { userId: session.user.id, animalId: parsed.data.animalId } },
    create: { userId: session.user.id, animalId: parsed.data.animalId },
    update: {},
  });

  return NextResponse.json({ success: true });
}
