import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/followups – current user's follow-ups
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Mark overdue ones first
    await prisma.adoptionFollowUp.updateMany({
      where: {
        status:      "PENDING",
        scheduledAt: { lt: now },
        application: { userId: authUser.id },
      },
      data: { status: "OVERDUE" },
    });

    const followUps = await prisma.adoptionFollowUp.findMany({
      where:   { application: { userId: authUser.id } },
      include: {
        application: {
          select: {
            id:     true,
            animal: {
              select: {
                name:   true,
                slug:   true,
                images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                shelter: { select: { name: true, slug: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json(followUps);
  } catch (error) {
    console.error('[api/followups GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
