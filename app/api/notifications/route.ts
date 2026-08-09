import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/notifications – user's notifications
//   ?filter=unread  → only unread
//   ?limit=N        → max rows (default 40, max 100)
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const filter   = req.nextUrl.searchParams.get("filter");
    const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 40);
    const limit    = Math.min(100, Math.max(1, isNaN(rawLimit) ? 40 : rawLimit));

    const where = {
      userId: authUser.id,
      ...(filter === "unread" && { readAt: null }),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
        take:    limit,
      }),
      prisma.notification.count({
        where: { userId: authUser.id, readAt: null },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error('[api/notifications GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
