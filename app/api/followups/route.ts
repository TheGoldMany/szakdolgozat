import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/followups – current user's follow-ups
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const now = new Date();

  // Mark overdue ones first
  await prisma.adoptionFollowUp.updateMany({
    where: {
      status:      "PENDING",
      scheduledAt: { lt: now },
      application: { userId: session.user.id },
    },
    data: { status: "OVERDUE" },
  });

  const followUps = await prisma.adoptionFollowUp.findMany({
    where:   { application: { userId: session.user.id } },
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
}
