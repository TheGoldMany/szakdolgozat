import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  shelterId:  z.string().min(1),
  animalId:   z.string().optional(),
  proposedAt: z.string().datetime(),
  note:       z.string().max(1000).optional(),
});

// POST /api/appointments – user requests an appointment
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  try {
    const { shelterId, animalId, proposedAt, note } = parsed.data;

    // Verify shelter exists
    const shelter = await prisma.shelter.findUnique({ where: { id: shelterId }, select: { id: true } });
    if (!shelter) return NextResponse.json({ error: "Menhely nem található" }, { status: 404 });

    // Verify animal belongs to shelter (if provided)
    if (animalId) {
      const animal = await prisma.animal.findUnique({ where: { id: animalId }, select: { shelterId: true } });
      if (!animal || animal.shelterId !== shelterId) {
        return NextResponse.json({ error: "Állat nem tartozik ehhez a menhelyhez" }, { status: 400 });
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        shelterId,
        userId:    user!.id,
        animalId:  animalId ?? null,
        proposedAt: new Date(proposedAt),
        note:      note ?? null,
      },
      include: {
        shelter: { select: { name: true, city: true } },
        animal:  { select: { name: true, slug: true } },
        user:    { select: { name: true } },
      },
    });

    // Notify all shelter admins about new appointment
    const admins = await prisma.shelterAdmin.findMany({
      where: { shelterId },
      select: { userId: true },
    });
    const displayDate = new Date(proposedAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    await createNotifications(admins.map(a => ({
      userId: a.userId,
      type:   "APPOINTMENT_NEW" as const,
      title:  "Új időpontfoglalás",
      body:   `${appointment.user.name ?? "Ismeretlen"} – ${displayDate}${appointment.animal ? ` (${appointment.animal.name})` : ""}`,
      href:   "/dashboard/appointments",
    })));

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('[api/appointments POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/appointments – authenticated user's own appointments
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const appointments = await prisma.appointment.findMany({
      where:   { userId: authUser.id },
      orderBy: { proposedAt: "desc" },
      include: {
        shelter: { select: { name: true, city: true, slug: true } },
        animal:  { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error('[api/appointments GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
