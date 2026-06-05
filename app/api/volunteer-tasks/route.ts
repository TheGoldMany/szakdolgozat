import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  shelterId:    z.string().min(1),
  title:        z.string().min(1).max(200),
  description:  z.string().max(2000).optional(),
  scheduledAt:  z.string().datetime(),
  maxVolunteers: z.number().int().min(1).max(100).optional(),
});

// POST /api/volunteer-tasks – admin creates a task
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const { shelterId, title, description, scheduledAt, maxVolunteers } = parsed.data;

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const task = await prisma.volunteerTask.create({
    data: {
      shelterId,
      title,
      description:   description ?? null,
      scheduledAt:   new Date(scheduledAt),
      maxVolunteers: maxVolunteers ?? 1,
    },
    include: {
      assignments: { include: { volunteer: { include: { user: { select: { name: true } } } } } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}

// GET /api/volunteer-tasks?shelterId=xxx – get tasks for shelter
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

  const tasks = await prisma.volunteerTask.findMany({
    where:   { shelterId: { in: shelterIds } },
    orderBy: { scheduledAt: "asc" },
    include: {
      assignments: {
        include: { volunteer: { include: { user: { select: { name: true, email: true } } } } },
      },
    },
  });

  return NextResponse.json(tasks);
}
