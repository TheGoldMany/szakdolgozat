import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications – user's notifications, unread first, last 40
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId: session.user.id },
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take:    40,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
