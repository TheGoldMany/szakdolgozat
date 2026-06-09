import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications – user's notifications
//   ?filter=unread  → only unread
//   ?limit=N        → max rows (default 40, max 100)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const filter   = req.nextUrl.searchParams.get("filter");
  const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 40);
  const limit    = Math.min(100, Math.max(1, isNaN(rawLimit) ? 40 : rawLimit));

  const where = {
    userId: session.user.id,
    ...(filter === "unread" && { readAt: null }),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take:    limit,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
