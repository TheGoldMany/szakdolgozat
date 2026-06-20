import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/campaigns – list PENDING campaigns (SUPER_ADMIN only)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      where:   { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('[api/admin/campaigns GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
