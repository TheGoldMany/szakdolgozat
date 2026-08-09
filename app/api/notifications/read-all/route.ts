import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

// POST /api/notifications/read-all – mark all as read
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    await prisma.notification.updateMany({
      where: { userId: user!.id, readAt: null },
      data:  { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/notifications/read-all POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
