import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

const schema = z.object({
  guests: z.number().int().min(0).max(20).optional(),
  note:   z.string().max(1000).optional(),
});

// POST /api/events/[id]/register – user registers (or re-activates) for an event
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }
  const guests = parsed.data.guests ?? 0;
  const note   = parsed.data.note;

  const event = await prisma.event.findUnique({
    where:  { id: params.id },
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
  });
  if (!event) return NextResponse.json({ error: "Esemény nem található" }, { status: 404 });
  if (event.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Erre az eseményre nem lehet jelentkezni" }, { status: 409 });
  }
  if (event.startsAt < new Date()) {
    return NextResponse.json({ error: "Az esemény már lezajlott" }, { status: 409 });
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: params.id, userId: session.user.id } },
  });

  // Capacity check (counts head + guests of active registrations)
  if (event.capacity != null) {
    const agg = await prisma.eventRegistration.aggregate({
      where:  { eventId: params.id, status: "REGISTERED" },
      _sum:   { guests: true },
      _count: { id: true },
    });
    let taken = (agg._count.id) + (agg._sum.guests ?? 0);
    // Ha újra-jelentkezésről van szó (volt CANCELLED), a saját korábbi helye már nem számít,
    // mert CANCELLED állapotot nem összegeztünk. Új igény: 1 + guests.
    if (existing?.status === "REGISTERED") {
      taken -= 1 + existing.guests; // a jelenlegi foglalását kivesszük, mert felülírjuk
    }
    if (taken + 1 + guests > event.capacity) {
      return NextResponse.json({ error: "Az esemény betelt" }, { status: 409 });
    }
  }

  const registration = await prisma.eventRegistration.upsert({
    where:  { eventId_userId: { eventId: params.id, userId: session.user.id } },
    update: { status: "REGISTERED", guests, note: note ?? null },
    create: { eventId: params.id, userId: session.user.id, status: "REGISTERED", guests, note: note ?? null },
  });

  // Notify shelter admins only on a genuinely new registration
  if (!existing || existing.status !== "REGISTERED") {
    const [admins, user] = await Promise.all([
      prisma.shelterAdmin.findMany({ where: { shelterId: event.shelterId }, select: { userId: true } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
    ]);
    createNotifications(admins.map(a => ({
      userId: a.userId,
      type:   "EVENT_REGISTRATION" as const,
      title:  "Új esemény-jelentkezés",
      body:   `${user?.name ?? "Egy felhasználó"} jelentkezett: „${event.title}”.`,
      href:   "/dashboard/events",
    }))).catch(() => {});
  }

  return NextResponse.json(registration, { status: 201 });
}

// DELETE /api/events/[id]/register – user cancels their registration
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId: params.id, userId: session.user.id } },
  });
  if (!existing) return NextResponse.json({ error: "Nincs jelentkezésed" }, { status: 404 });

  await prisma.eventRegistration.update({
    where: { eventId_userId: { eventId: params.id, userId: session.user.id } },
    data:  { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
