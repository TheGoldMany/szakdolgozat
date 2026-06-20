import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryCategory } from "@prisma/client";

const patchSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  category:    z.nativeEnum(InventoryCategory).optional(),
  unit:        z.string().min(1).max(20).optional(),
  minQuantity: z.number().min(0).nullable().optional(),
  expiresAt:   z.string().datetime().nullable().optional(),
  note:        z.string().max(1000).nullable().optional(),
});

async function authorize(userId: string, role: string, itemId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId }, select: { shelterId: true } });
  if (!item) return { ok: false, item: null };
  if (role === "SUPER_ADMIN") return { ok: true, item };
  const isAdmin = await prisma.shelterAdmin.findFirst({ where: { userId, shelterId: item.shelterId } });
  return { ok: !!isAdmin, item };
}

// PATCH /api/inventory/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const { ok, item } = await authorize(session.user.id, session.user.role, params.id);
    if (!ok || !item) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });

    const body   = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

    const updated = await prisma.inventoryItem.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt !== undefined
          ? (parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null)
          : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/inventory/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  try {
    const { ok } = await authorize(session.user.id, session.user.role, params.id);
    if (!ok) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });

    await prisma.inventoryItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/inventory/[id] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
