import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/notifications/[id] – mark single notification as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const n = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!n || n.userId !== session.user.id) {
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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const n = await prisma.notification.findUnique({ where: { id: params.id } });
    if (!n || n.userId !== session.user.id) {
      return NextResponse.json({ error: "Nem található" }, { status: 404 });
    }

    await prisma.notification.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/notifications/[id] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
