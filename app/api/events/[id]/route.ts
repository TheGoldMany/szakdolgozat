import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { sendEventCancelledEmail } from "@/lib/email";

const patchSchema = z.object({
  title:       z.string().min(2).max(200).optional(),
  description: z.string().min(2).optional(),
  type:        z.enum(["ADOPTION_DAY", "FUNDRAISER", "VOLUNTEER_DAY", "OPEN_DAY", "EDUCATION", "OTHER"]).optional(),
  location:    z.string().min(1).max(300).optional(),
  startsAt:    z.string().datetime().optional(),
  endsAt:      z.string().datetime().optional().nullable(),
  capacity:    z.number().int().min(1).max(100000).optional().nullable(),
  imageUrl:    z.string().url().optional().or(z.literal("")).optional(),
  status:      z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).optional(),
});

async function canManage(userId: string, role: string | undefined, shelterId: string) {
  if (role === "SUPER_ADMIN") return true;
  const admin = await prisma.shelterAdmin.findFirst({ where: { userId, shelterId } });
  return !!admin;
}

// PATCH /api/events/[id] – admin edits an event or changes its status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }
  const d = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Esemény nem található" }, { status: 404 });

  if (!(await canManage(session.user.id, session.user.role, event.shelterId))) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const newStarts = d.startsAt ? new Date(d.startsAt) : event.startsAt;
  const newEnds   = d.endsAt !== undefined ? (d.endsAt ? new Date(d.endsAt) : null) : event.endsAt;
  if (newEnds && newEnds < newStarts) {
    return NextResponse.json({ error: "A befejezés nem lehet a kezdés előtt" }, { status: 400 });
  }

  const becameCancelled = d.status === "CANCELLED" && event.status !== "CANCELLED";
  const detailsChanged  =
    event.status === "PUBLISHED" &&
    d.status !== "CANCELLED" &&
    ((d.startsAt && newStarts.getTime() !== event.startsAt.getTime()) ||
      (d.location && d.location !== event.location));

  const updated = await prisma.event.update({
    where: { id: params.id },
    data: {
      ...(d.title       !== undefined && { title: d.title }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.type        !== undefined && { type: d.type }),
      ...(d.location    !== undefined && { location: d.location }),
      ...(d.startsAt    !== undefined && { startsAt: newStarts }),
      ...(d.endsAt      !== undefined && { endsAt: newEnds }),
      ...(d.capacity    !== undefined && { capacity: d.capacity }),
      ...(d.imageUrl    !== undefined && { imageUrl: d.imageUrl || null }),
      ...(d.status      !== undefined && { status: d.status }),
    },
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
  });

  // Notify registrants on cancellation or on key detail change
  if (becameCancelled || detailsChanged) {
    const regs = await prisma.eventRegistration.findMany({
      where:   { eventId: params.id, status: "REGISTERED" },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    const userIds = [...new Set(regs.map(r => r.userId))];
    if (userIds.length > 0) {
      createNotifications(userIds.map(userId => ({
        userId,
        type:  becameCancelled ? ("EVENT_CANCELLED" as const) : ("EVENT_UPDATED" as const),
        title: becameCancelled ? "Esemény lemondva" : "Esemény módosítva",
        body:  becameCancelled
          ? `A(z) "${updated.title}" esemény sajnos elmaradt.`
          : `A(z) "${updated.title}" esemény részletei megváltoztak.`,
        href:  `/events/${updated.slug}`,
      }))).catch(() => {});

      if (becameCancelled) {
        const dateStr = event.startsAt.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
        for (const reg of regs) {
          if (reg.user?.email) {
            sendEventCancelledEmail({
              to:         reg.user.email,
              name:       reg.user.name ?? "Felhasználó",
              eventTitle: updated.title,
              eventDate:  dateStr,
            }).catch(() => {});
          }
        }
      }
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/events/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Esemény nem található" }, { status: 404 });

  if (!(await canManage(session.user.id, session.user.role, event.shelterId))) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  await prisma.event.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
