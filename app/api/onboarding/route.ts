import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/onboarding — mark the dashboard tour as seen for the current user
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { dashboardTourSeen: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/onboarding POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
