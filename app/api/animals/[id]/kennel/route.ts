import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  kennelId: z.string().nullable(),  // null = kivétel a férőhelyről
});

// PATCH /api/animals/[id]/kennel – állat áthelyezése férőhelyek között
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const animal = await prisma.animal.findUnique({
      where:  { id: params.id },
      select: { shelterId: true, kennelId: true },
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
    if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

    const { kennelId } = parsed.data;

    // Ugyanaz a kennel → nincs teendő
    if (kennelId === animal.kennelId) {
      return NextResponse.json({ success: true, kennelId });
    }

    if (kennelId) {
      const kennel = await prisma.kennel.findUnique({
        where:   { id: kennelId },
        include: { _count: { select: { animals: true } } },
      });
      if (!kennel) return NextResponse.json({ error: "A férőhely nem található" }, { status: 404 });

      // Csak ugyanazon menhely férőhelyére helyezhető
      if (kennel.shelterId !== animal.shelterId) {
        return NextResponse.json({ error: "A férőhely másik menhelyhez tartozik" }, { status: 400 });
      }

      // Kapacitás ellenőrzés – tele van?
      if (kennel._count.animals >= kennel.capacity) {
        return NextResponse.json(
          { error: `A(z) „${kennel.name}" férőhely megtelt (${kennel._count.animals}/${kennel.capacity}).` },
          { status: 409 },
        );
      }
    }

    await prisma.animal.update({
      where: { id: params.id },
      data:  { kennelId },
    });

    return NextResponse.json({ success: true, kennelId });
  } catch (error) {
    console.error('[api/animals/[id]/kennel PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
