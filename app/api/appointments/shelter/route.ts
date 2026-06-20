import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/appointments/shelter – admin sees all appointments for their shelter(s)
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    let shelterIds: string[];

    if (session.user.role === "SUPER_ADMIN") {
      const all = await prisma.shelter.findMany({ select: { id: true } });
      shelterIds = all.map(s => s.id);
    } else {
      const adminOf = await prisma.shelterAdmin.findMany({
        where:  { userId: session.user.id },
        select: { shelterId: true },
      });
      shelterIds = adminOf.map(a => a.shelterId);
    }

    if (shelterIds.length === 0) {
      return NextResponse.json([]);
    }

    const appointments = await prisma.appointment.findMany({
      where:   { shelterId: { in: shelterIds } },
      orderBy: { proposedAt: "asc" },
      include: {
        user:    { select: { name: true, email: true, phone: true } },
        animal:  { select: { name: true, slug: true } },
        shelter: { select: { name: true } },
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('[api/appointments/shelter GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
