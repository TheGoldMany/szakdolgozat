import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

const txSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("IN"),     quantity:       z.number().positive(), note: z.string().max(500).optional() }),
  z.object({ type: z.literal("OUT"),    quantity:       z.number().positive(), note: z.string().max(500).optional() }),
  z.object({ type: z.literal("ADJUST"), targetQuantity: z.number().min(0),     note: z.string().max(500).optional() }),
]);

// GET /api/inventory/[id]/transactions
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const item = await prisma.inventoryItem.findUnique({
      where:  { id: params.id },
      select: { shelterId: true },
    });
    if (!item) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN") {
      const isAdmin = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id, shelterId: item.shelterId },
      });
      if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const txs = await prisma.inventoryTransaction.findMany({
      where:   { itemId: params.id },
      orderBy: { createdAt: "desc" },
      take:    100,
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json(txs);
  } catch (error) {
    console.error('[api/inventory/[id]/transactions GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/[id]/transactions
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const item = await prisma.inventoryItem.findUnique({ where: { id: params.id } });
    if (!item) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    if (session.user.role !== "SUPER_ADMIN") {
      const isAdmin = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id, shelterId: item.shelterId },
      });
      if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = txSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    let delta: number;

    if (data.type === "IN") {
      delta = data.quantity;
    } else if (data.type === "OUT") {
      delta = -data.quantity;
      if (item.quantity + delta < 0) {
        return NextResponse.json({ error: "A készlet nem mehet nullá alá" }, { status: 422 });
      }
    } else {
      // ADJUST — tényleges értékre állít, delta = különbség
      delta = data.targetQuantity - item.quantity;
    }

    const newQty = item.quantity + delta;

    // Update quantity + create transaction in a transaction
    const [updatedItem] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: params.id },
        data:  { quantity: newQty },
      }),
      prisma.inventoryTransaction.create({
        data: {
          itemId:      params.id,
          type:        data.type,
          quantity:    delta,
          note:        data.note ?? null,
          createdById: session.user.id,
        },
      }),
    ]);

    // Low-stock notification
    if (item.minQuantity !== null && newQty < item.minQuantity) {
      const admins = await prisma.shelterAdmin.findMany({
        where:  { shelterId: item.shelterId },
        select: { userId: true },
      });
      await createNotifications(admins.map((a) => ({
        userId: a.userId,
        type:   "INVENTORY_LOW_STOCK" as const,
        title:  `Alacsony készlet: ${item.name}`,
        body:   `Jelenlegi mennyiség: ${newQty.toLocaleString("hu-HU")} ${item.unit} (minimum: ${item.minQuantity} ${item.unit})`,
        href:   `/dashboard/inventory/${params.id}`,
      })));
    }

    // Expiring-soon notification (only on first transaction that reveals it, at most daily)
    if (item.expiresAt) {
      const daysLeft = Math.ceil((item.expiresAt.getTime() - Date.now()) / 86_400_000);
      if (daysLeft >= 0 && daysLeft <= 7) {
        const admins = await prisma.shelterAdmin.findMany({
          where:  { shelterId: item.shelterId },
          select: { userId: true },
        });
        await createNotifications(admins.map((a) => ({
          userId: a.userId,
          type:   "INVENTORY_EXPIRING_SOON" as const,
          title:  `Hamarosan lejár: ${item.name}`,
          body:   daysLeft === 0
            ? "Ma jár le!"
            : `${daysLeft} napon belül lejár`,
          href:   `/dashboard/inventory/${params.id}`,
        })));
      }
    }

    return NextResponse.json(updatedItem, { status: 201 });
  } catch (error) {
    console.error('[api/inventory/[id]/transactions POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
