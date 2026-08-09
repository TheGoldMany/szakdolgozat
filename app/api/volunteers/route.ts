import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  shelterId:    z.string().min(1),
  motivation:   z.string().max(2000).optional(),
  skills:       z.string().max(500).optional(),
  availability: z.string().max(200).optional(),
});

// POST /api/volunteers – user applies as volunteer
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { shelterId, motivation, skills, availability } = parsed.data;

  const shelter = await prisma.shelter.findUnique({ where: { id: shelterId }, select: { id: true } });
  if (!shelter) return NextResponse.json({ error: "Menhely nem található" }, { status: 404 });

  const existing = await prisma.volunteer.findUnique({
    where: { userId_shelterId: { userId: user!.id, shelterId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Már jelentkeztél ehhez a menhelyhez" }, { status: 409 });
  }

  const volunteer = await prisma.volunteer.create({
    data: { userId: user!.id, shelterId, motivation, skills, availability },
    include: { shelter: { select: { name: true } }, user: { select: { name: true } } },
  });

  // Notify shelter admins about new volunteer application
  const admins = await prisma.shelterAdmin.findMany({
    where: { shelterId },
    select: { userId: true },
  });
  createNotifications(admins.map((a) => ({
    userId: a.userId,
    type:   "VOLUNTEER_NEW" as const,
    title:  "Új önkéntes jelentkezés",
    body:   `${volunteer.user.name ?? "Ismeretlen"} szeretne önkénteskedni a menhelynél.`,
    href:   "/dashboard/volunteers",
  }))).catch(() => {});

  return NextResponse.json(volunteer, { status: 201 });
}

// GET /api/volunteers – authenticated user's volunteer records
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const records = await prisma.volunteer.findMany({
    where:   { userId: authUser.id },
    include: {
      shelter:     { select: { name: true, city: true, slug: true } },
      assignments: {
        include: { task: { select: { title: true, scheduledAt: true, status: true } } },
      },
      attendances: { orderBy: { date: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(records);
}
