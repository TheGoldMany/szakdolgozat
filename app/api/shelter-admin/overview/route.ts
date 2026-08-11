import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

/**
 * GET /api/shelter-admin/overview
 *
 * A menhely admin napi áttekintője egyetlen kérésben (elsősorban a
 * mobilalkalmazás admin fülének). Csak a saját menhely adatait adja vissza.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  if (user!.role !== "SHELTER_ADMIN" && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const admin = await prisma.shelterAdmin.findFirst({
    where:  { userId: user!.id },
    select: { shelterId: true, shelter: { select: { id: true, name: true } } },
  });
  if (!admin) {
    return NextResponse.json({ error: "Nincs hozzárendelt menhely" }, { status: 404 });
  }
  const shelterId = admin.shelterId;

  const now = new Date();

  try {
    const [pendingApplications, upcomingAppointments, availableAnimals] = await Promise.all([
      prisma.adoptionApplication.findMany({
        where:   { animal: { shelterId }, status: { in: ["PENDING", "REVIEWING"] } },
        orderBy: { createdAt: "desc" },
        take:    20,
        select: {
          id: true, status: true, createdAt: true,
          user:   { select: { name: true, email: true } },
          animal: { select: { name: true, slug: true } },
        },
      }),
      prisma.appointment.findMany({
        where:   { shelterId, status: { in: ["PENDING", "CONFIRMED"] }, proposedAt: { gte: now } },
        orderBy: { proposedAt: "asc" },
        take:    20,
        select: {
          id: true, status: true, proposedAt: true, confirmedAt: true, note: true,
          user:   { select: { name: true, email: true } },
          animal: { select: { name: true, slug: true } },
        },
      }),
      prisma.animal.count({ where: { shelterId, status: "AVAILABLE" } }),
    ]);

    return NextResponse.json({
      shelter: admin.shelter,
      counts: {
        pendingApplications:  pendingApplications.length,
        upcomingAppointments: upcomingAppointments.length,
        availableAnimals,
      },
      pendingApplications,
      upcomingAppointments,
    });
  } catch (err) {
    console.error("[api/shelter-admin/overview GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
