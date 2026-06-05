import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/read-all – mark all as read
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data:  { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
