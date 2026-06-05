import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

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

  const isOwner = appt.userId === session.user.id;
  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: appt.shelter.id },
  });
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

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
}

// GET /api/appointments/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const appt = await prisma.appointment.findUnique({
    where:   { id: params.id },
    include: {
      shelter: { select: { name: true, city: true, slug: true } },
      animal:  { select: { name: true, slug: true } },
      user:    { select: { name: true, email: true } },
    },
  });
  if (!appt) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isOwner = appt.userId === session.user.id;
  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: appt.shelterId },
  });

  if (!isOwner && !isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  return NextResponse.json(appt);
}
