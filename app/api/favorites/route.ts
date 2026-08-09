import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";

// GET /api/favorites – the current user's favorited animal IDs
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ animalIds: [] });
  }

  try {
    const favorites = await prisma.favorite.findMany({
      where:  { userId: authUser.id },
      select: { animalId: true },
    });

    return NextResponse.json({ animalIds: favorites.map((f) => f.animalId) });
  } catch (error) {
    console.error('[api/favorites GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/favorites – add an animal to favorites
const schema = z.object({ animalId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Hibás adat" }, { status: 400 });
  }

  try {
    const animal = await prisma.animal.findUnique({
      where:  { id: parsed.data.animalId },
      select: { id: true },
    });
    if (!animal) {
      return NextResponse.json({ error: "Az állat nem található" }, { status: 404 });
    }

    await prisma.favorite.upsert({
      where:  { userId_animalId: { userId: user!.id, animalId: parsed.data.animalId } },
      create: { userId: user!.id, animalId: parsed.data.animalId },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/favorites POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
