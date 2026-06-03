import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

// GET /api/applications/my – saját kérelmek (web session vagy mobil Bearer token)
export async function GET(req: NextRequest) {
  const session    = await getServerSession(authOptions);
  const mobileUser = session?.user?.id ? null : await getMobileUser(req);
  const userId     = session?.user?.id ?? mobileUser?.id;

  if (!userId) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const applications = await prisma.adoptionApplication.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id:        true,
      status:    true,
      createdAt: true,
      animal: {
        select: {
          id:     true,
          name:   true,
          type:   true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true, isPrimary: true } },
        },
      },
    },
  });

  return NextResponse.json(applications);
}
