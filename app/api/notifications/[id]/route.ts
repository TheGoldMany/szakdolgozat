import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

// PATCH /api/notifications/[id] – mark single notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    const n = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!n || n.userId !== user!.id) {
      return NextResponse.json({ error: "Nem található" }, { status: 404 });
    }

    if (!n.readAt) {
      await prisma.notification.update({
        where: { id: params.id },
        data:  { readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/notifications/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] – remove a single notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    const n = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!n || n.userId !== user!.id) {
      return NextResponse.json({ error: "Nem található" }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/notifications/[id] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
