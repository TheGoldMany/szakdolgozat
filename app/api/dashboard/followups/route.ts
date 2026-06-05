import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/followups – admin sees all follow-ups for their shelter
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId: string | null = null;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
    shelterId = admin.shelterId;
  }

  const now = new Date();

  // Mark overdue
  await prisma.adoptionFollowUp.updateMany({
    where: {
      status:      "PENDING",
      scheduledAt: { lt: now },
      ...(shelterId ? { application: { animal: { shelterId } } } : {}),
    },
    data: { status: "OVERDUE" },
  });

  const followUps = await prisma.adoptionFollowUp.findMany({
    where: shelterId
      ? { application: { animal: { shelterId } } }
      : {},
    include: {
      application: {
        select: {
          id:    true,
          user:  { select: { name: true, email: true } },
          animal: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { scheduledAt: "asc" },
    ],
  });

  return NextResponse.json(followUps);
}
