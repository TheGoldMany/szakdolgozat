import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugifyEvent } from "@/lib/event";

const createSchema = z.object({
  shelterId:   z.string().min(1),
  title:       z.string().min(2).max(200),
  description: z.string().min(2),
  type:        z.enum(["ADOPTION_DAY", "FUNDRAISER", "VOLUNTEER_DAY", "OPEN_DAY", "EDUCATION", "OTHER"]),
  location:    z.string().min(1).max(300),
  startsAt:    z.string().datetime(),
  endsAt:      z.string().datetime().optional().nullable(),
  capacity:    z.number().int().min(1).max(100000).optional().nullable(),
  imageUrl:    z.string().url().optional().or(z.literal("")).optional(),
  publish:     z.boolean().optional(),
});

// GET /api/events?shelterId=xxx – admin: events of their shelter(s)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const shelterId = req.nextUrl.searchParams.get("shelterId");

  let shelterIds: string[] = [];
  if (shelterId) {
    shelterIds = [shelterId];
  } else if (session.user.role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    shelterIds = all.map(s => s.id);
  } else {
    const admins = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id }, select: { shelterId: true },
    });
    shelterIds = admins.map(a => a.shelterId);
  }

  const events = await prisma.event.findMany({
    where:   { shelterId: { in: shelterIds } },
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
  });

  return NextResponse.json(events);
}

// POST /api/events – admin creates an event
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: d.shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  if (d.endsAt && new Date(d.endsAt) < new Date(d.startsAt)) {
    return NextResponse.json({ error: "A befejezés nem lehet a kezdés előtt" }, { status: 400 });
  }

  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const slug   = `${slugifyEvent(d.title) || "esemeny"}-${suffix}`;

  const event = await prisma.event.create({
    data: {
      shelterId:   d.shelterId,
      title:       d.title,
      slug,
      description: d.description,
      type:        d.type,
      location:    d.location,
      startsAt:    new Date(d.startsAt),
      endsAt:      d.endsAt ? new Date(d.endsAt) : null,
      capacity:    d.capacity ?? null,
      imageUrl:    d.imageUrl || null,
      status:      d.publish ? "PUBLISHED" : "DRAFT",
    },
    include: { _count: { select: { registrations: { where: { status: "REGISTERED" } } } } },
  });

  return NextResponse.json(event, { status: 201 });
}
