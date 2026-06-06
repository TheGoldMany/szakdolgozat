import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  fosterId: z.string().nullable(),  // null = visszahozatal a menhelyre
});

// PATCH /api/animals/[id]/foster – állat ideiglenes kihelyezése befogadóhoz
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  const animal = await prisma.animal.findUnique({
    where:  { id: params.id },
    select: { shelterId: true, name: true },
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

  const { fosterId } = parsed.data;

  if (fosterId) {
    const foster = await prisma.fosterProfile.findUnique({
      where:  { id: fosterId },
      select: { shelterId: true, status: true, userId: true },
    });
    if (!foster) return NextResponse.json({ error: "Az ideiglenes befogadó nem található" }, { status: 404 });
    if (foster.shelterId !== animal.shelterId) {
      return NextResponse.json({ error: "A befogadó másik menhelyhez tartozik" }, { status: 400 });
    }
    if (foster.status !== "ACTIVE") {
      return NextResponse.json({ error: "Csak aktív ideiglenes befogadóhoz lehet állatot kihelyezni" }, { status: 400 });
    }

    // Kihelyezéskor az állat státusza FOSTER, kennelből kikerül
    await prisma.animal.update({
      where: { id: params.id },
      data:  { fosterId, status: "FOSTER", kennelId: null },
    });

    createNotification({
      userId: foster.userId,
      type:   "FOSTER_PLACEMENT",
      title:  "Új állat a gondozásodban",
      body:   `${animal.name} ideiglenesen hozzád került. Köszönjük a segítséget!`,
      href:   "/foster",
    }).catch(() => {});
  } else {
    // Visszahozatal a menhelyre
    await prisma.animal.update({
      where: { id: params.id },
      data:  { fosterId: null },
    });
  }

  return NextResponse.json({ success: true, fosterId });
}
