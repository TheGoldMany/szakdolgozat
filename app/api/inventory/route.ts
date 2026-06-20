import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryCategory } from "@prisma/client";

const createSchema = z.object({
  shelterId:   z.string().min(1),
  name:        z.string().min(1).max(200),
  category:    z.nativeEnum(InventoryCategory).optional(),
  unit:        z.string().min(1).max(20).optional(),
  quantity:    z.number().min(0).optional(),
  minQuantity: z.number().min(0).nullable().optional(),
  expiresAt:   z.string().datetime().nullable().optional(),
  note:        z.string().max(1000).nullable().optional(),
});

async function resolveShelterIds(userId: string, role: string): Promise<string[]> {
  if (role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    return all.map((s) => s.id);
  }
  const admins = await prisma.shelterAdmin.findMany({
    where: { userId }, select: { shelterId: true },
  });
  return admins.map((a) => a.shelterId);
}

// GET /api/inventory?shelterId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const paramId    = req.nextUrl.searchParams.get("shelterId");
    const shelterIds = paramId ? [paramId] : await resolveShelterIds(session.user.id, session.user.role);

    const items = await prisma.inventoryItem.findMany({
      where:   { shelterId: { in: shelterIds } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true } } },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('[api/inventory GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  const body   = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });

  try {
    const { shelterId, name, category, unit, quantity, minQuantity, expiresAt, note } = parsed.data;

    const isAdmin = session.user.role === "SUPER_ADMIN" ||
      !!(await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id, shelterId } }));
    if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });

    const item = await prisma.inventoryItem.create({
      data: {
        shelterId,
        name,
        category:    category    ?? "OTHER",
        unit:        unit        ?? "db",
        quantity:    quantity    ?? 0,
        minQuantity: minQuantity ?? null,
        expiresAt:   expiresAt   ? new Date(expiresAt) : null,
        note:        note        ?? null,
      },
    });

    // Record opening stock as an IN transaction (if non-zero)
    if ((quantity ?? 0) > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          itemId:      item.id,
          type:        "IN",
          quantity:    quantity!,
          note:        "Nyitókészlet",
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('[api/inventory POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
