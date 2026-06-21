import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/animals/[id]/sponsors – aktív virtuális gazdik listája + statisztika
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  try {
    const sponsorships = await prisma.sponsorship.findMany({
      where:   { animalId: params.id, status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Publikus gazdik nevei (anonim szponzorok kihagyva)
    const publicSponsors = sponsorships
      .filter((s) => s.isPublic)
      .map((s) => ({ name: s.displayName ?? s.user?.name ?? "Virtuális gazdi" }));

    const count = sponsorships.length;

    // Havi bevételt csak a menhely adminja / superadmin lát
    let monthlyRevenue: number | null = null;
    if (session?.user?.id) {
      const animal = await prisma.animal.findUnique({
        where:  { id: params.id },
        select: { shelterId: true },
      });
      if (animal) {
        const isAdmin = session.user.role === "SUPER_ADMIN" ||
          (await prisma.shelterAdmin.findFirst({
            where: { userId: session.user.id, shelterId: animal.shelterId },
          })) !== null;
        if (isAdmin) {
          monthlyRevenue = sponsorships.reduce((sum, s) => sum + s.amount, 0);
        }
      }
    }

    return NextResponse.json({ count, publicSponsors, monthlyRevenue });
  } catch (error) {
    console.error('[api/animals/[id]/sponsors GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
