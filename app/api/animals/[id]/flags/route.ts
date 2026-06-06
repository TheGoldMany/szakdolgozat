import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalFlag } from "@prisma/client";

const schema = z.object({
  flags:         z.array(z.nativeEnum(AnimalFlag)),
  progressLevel: z.number().int().min(0).max(100).nullable().optional(),
});

// PATCH /api/animals/[id]/flags – belső viselkedési címkék + fejlődési szint
export async function PATCH(
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

  const updated = await prisma.animal.update({
    where: { id: params.id },
    data: {
      flags: parsed.data.flags,
      ...(parsed.data.progressLevel !== undefined
        ? { progressLevel: parsed.data.progressLevel }
        : {}),
    },
    select: { flags: true, progressLevel: true },
  });

  return NextResponse.json(updated);
}
