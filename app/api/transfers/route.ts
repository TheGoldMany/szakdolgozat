import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/transfers – list transfers relevant to the current admin
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  let fromShelterIds: string[] = [];
  let toShelterIds:   string[] = [];

  if (session.user.role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    fromShelterIds = toShelterIds = all.map(s => s.id);
  } else {
    const adminRows = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id },
      select: { shelterId: true },
    });
    fromShelterIds = toShelterIds = adminRows.map(a => a.shelterId);
  }

  const transfers = await prisma.animalTransfer.findMany({
    where: {
      OR: [
        { fromShelterId: { in: fromShelterIds } },
        { toShelterId:   { in: toShelterIds   } },
      ],
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      animal:      { select: { id: true, name: true, slug: true, type: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
      fromShelter: { select: { id: true, name: true } },
      toShelter:   { select: { id: true, name: true } },
      requestedBy: { select: { name: true } },
      resolvedBy:  { select: { name: true } },
    },
  });

  return NextResponse.json(transfers);
}
