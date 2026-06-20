import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  itemId:   z.string().min(1),
  quantity: z.number().positive(),
  note:     z.string().max(500).optional(),
});

// GET /api/foster/[id]/supply – kiadott készletek listája
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const foster = await prisma.fosterProfile.findUnique({
      where:  { id: params.id },
      select: { shelterId: true },
    });
    if (!foster) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN") {
      const isAdmin = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id, shelterId: foster.shelterId },
      });
      if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const logs = await prisma.fosterSupplyLog.findMany({
      where:   { fosterId: params.id },
      include: { item: { select: { name: true, unit: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('[api/foster/[id]/supply GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/foster/[id]/supply – táp/gyógyszer kiadása → automatikus készletlevonás
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const foster = await prisma.fosterProfile.findUnique({
      where:  { id: params.id },
      select: { shelterId: true },
    });
    if (!foster) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN") {
      const isAdmin = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id, shelterId: foster.shelterId },
      });
      if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

    const { itemId, quantity, note } = parsed.data;

    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: "A készlettétel nem található" }, { status: 404 });

    // A tételnek ugyanahhoz a menhelyhez kell tartoznia
    if (item.shelterId !== foster.shelterId) {
      return NextResponse.json({ error: "A tétel másik menhelyhez tartozik" }, { status: 400 });
    }

    if (item.quantity - quantity < 0) {
      return NextResponse.json(
        { error: `Nincs elég készlet. Elérhető: ${item.quantity} ${item.unit}.` },
        { status: 422 },
      );
    }

    // Levonás + tranzakció + supply log egy adatbázis-tranzakcióban
    const noteText = `Ideiglenes befogadónak kiadva${note ? ` – ${note}` : ""}`;
    const [, , supplyLog] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: itemId },
        data:  { quantity: item.quantity - quantity },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId,
          type:        "OUT",
          quantity:    -quantity,
          note:        noteText,
          createdById: session.user.id,
        },
      }),
      prisma.fosterSupplyLog.create({
        data: { fosterId: params.id, itemId, quantity, note, createdById: session.user.id },
        include: { item: { select: { name: true, unit: true } }, createdBy: { select: { name: true } } },
      }),
    ]);

    return NextResponse.json(supplyLog, { status: 201 });
  } catch (error) {
    console.error('[api/foster/[id]/supply POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
