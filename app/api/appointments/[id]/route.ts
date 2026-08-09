import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CONFIRM"), confirmedAt: z.string().datetime(), adminNote: z.string().max(500).optional() }),
  z.object({ action: z.literal("REJECT"),  adminNote: z.string().max(500).optional() }),
  z.object({ action: z.literal("CANCEL")  }),
  z.object({ action: z.literal("COMPLETE") }),
]);

// PATCH /api/appointments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    const appt = await prisma.appointment.findUnique({
      where:   { id: params.id },
      include: { shelter: { select: { id: true } } },
    });
    if (!appt) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    const body   = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
    }

    const isOwner = appt.userId === user!.id;
    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: user!.id, shelterId: appt.shelter.id },
    });
    const isSuperAdmin = user!.role === "SUPER_ADMIN";

    const { action } = parsed.data;

    // User can only cancel their own pending appointment
    if (action === "CANCEL") {
      if (!isOwner && !isAdmin && !isSuperAdmin) {
        return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
      }
      const updated = await prisma.appointment.update({
        where: { id: params.id },
        data: {
          status:      "CANCELLED",
          cancelledBy: isOwner ? "USER" : "ADMIN",
        },
      });
      return NextResponse.json(updated);
    }

    // Admin-only actions
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    if (action === "CONFIRM") {
      const updated = await prisma.appointment.update({
        where: { id: params.id },
        data: {
          status:      "CONFIRMED",
          confirmedAt: new Date(parsed.data.confirmedAt),
          adminNote:   parsed.data.adminNote ?? null,
        },
        include: { animal: { select: { name: true } } },
      });
      await createNotification({
        userId: appt.userId,
        type:   "APPOINTMENT_CONFIRMED",
        title:  "Időpontod visszaigazolva",
        body:   `${new Date(parsed.data.confirmedAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}${updated.animal ? ` – ${updated.animal.name}` : ""}`,
        href:   "/appointments",
      });
      return NextResponse.json(updated);
    }

    if (action === "REJECT") {
      const updated = await prisma.appointment.update({
        where: { id: params.id },
        data: {
          status:    "CANCELLED",
          cancelledBy: "ADMIN",
          adminNote: parsed.data.adminNote ?? null,
        },
      });
      await createNotification({
        userId: appt.userId,
        type:   "APPOINTMENT_CANCELLED",
        title:  "Időpont elutasítva",
        body:   parsed.data.adminNote ?? "A menhely nem tudta visszaigazolni az időpontot.",
        href:   "/appointments",
      });
      return NextResponse.json(updated);
    }

    if (action === "COMPLETE") {
      const updated = await prisma.appointment.update({
        where: { id: params.id },
        data:  { status: "COMPLETED" },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Ismeretlen művelet" }, { status: 400 });
  } catch (error) {
    console.error('[api/appointments/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/appointments/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const appt = await prisma.appointment.findUnique({
      where:   { id: params.id },
      include: {
        shelter: { select: { name: true, city: true, slug: true } },
        animal:  { select: { name: true, slug: true } },
        user:    { select: { name: true, email: true } },
      },
    });
    if (!appt) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    const isOwner = appt.userId === authUser.id;
    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: authUser.id, shelterId: appt.shelterId },
    });

    if (!isOwner && !isAdmin && authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    return NextResponse.json(appt);
  } catch (error) {
    console.error('[api/appointments/[id] GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
