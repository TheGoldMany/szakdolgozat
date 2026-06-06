import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KennelType } from "@prisma/client";

const schema = z.object({
  name:     z.string().min(1).max(100).optional(),
  type:     z.nativeEnum(KennelType).optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  note:     z.string().max(2000).nullable().optional(),
});

async function authorize(kennelId: string, userId: string, role: string | undefined) {
  const kennel = await prisma.kennel.findUnique({
    where:   { id: kennelId },
    include: { _count: { select: { animals: true } } },
  });
  if (!kennel) return { error: "Nem található", status: 404 as const };
  if (role !== "SUPER_ADMIN") {
    const admin = await prisma.shelterAdmin.findFirst({ where: { userId, shelterId: kennel.shelterId } });
    if (!admin) return { error: "Nincs jogosultságod", status: 403 as const };
  }
  return { kennel };
}

// PATCH /api/kennels/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  const auth = await authorize(params.id, session.user.id, session.user.role);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  // Kapacitást nem lehet a jelenlegi foglaltság alá csökkenteni
  if (parsed.data.capacity !== undefined && parsed.data.capacity < auth.kennel._count.animals) {
    return NextResponse.json(
      { error: `A férőhelyen jelenleg ${auth.kennel._count.animals} állat van, a kapacitás nem lehet ennél kisebb.` },
      { status: 400 },
    );
  }

  const updated = await prisma.kennel.update({
    where: { id: params.id },
    data:  parsed.data,
    include: { _count: { select: { animals: true } } },
  });
  return NextResponse.json(updated);
}

// DELETE /api/kennels/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  const auth = await authorize(params.id, session.user.id, session.user.role);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // A benne lévő állatok kennelId-je SetNull-ra áll (schema szerint)
  await prisma.kennel.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
