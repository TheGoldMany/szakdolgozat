import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

// POST /api/onboarding — mark the dashboard tour as seen for the current user
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    await prisma.user.update({
      where: { id: user!.id },
      data:  { dashboardTourSeen: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/onboarding POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
