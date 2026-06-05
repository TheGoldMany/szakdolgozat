import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

// POST /api/volunteer-tasks/[id]/assign – active volunteer signs up for a task
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const task = await prisma.volunteerTask.findUnique({
    where:   { id: params.id },
    include: { assignments: true },
  });
  if (!task) return NextResponse.json({ error: "Feladat nem található" }, { status: 404 });
  if (task.status !== "OPEN") return NextResponse.json({ error: "A feladat nem nyitott" }, { status: 400 });
  if (task.assignments.length >= task.maxVolunteers) {
    return NextResponse.json({ error: "A feladat betelt" }, { status: 400 });
  }

  const volunteer = await prisma.volunteer.findUnique({
    where: { userId_shelterId: { userId: session.user.id, shelterId: task.shelterId } },
  });
  if (!volunteer || volunteer.status !== "ACTIVE") {
    return NextResponse.json({ error: "Csak aktív önkéntes vállalhat feladatot" }, { status: 403 });
  }

  const existing = await prisma.volunteerTaskAssignment.findUnique({
    where: { taskId_volunteerId: { taskId: params.id, volunteerId: volunteer.id } },
  });
  if (existing) return NextResponse.json({ error: "Már elvállaltad ezt a feladatot" }, { status: 409 });

  const [assignment, user] = await Promise.all([
    prisma.volunteerTaskAssignment.create({
      data: { taskId: params.id, volunteerId: volunteer.id },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);

  // Mark ASSIGNED if max reached
  const totalAssigned = task.assignments.length + 1;
  if (totalAssigned >= task.maxVolunteers) {
    await prisma.volunteerTask.update({ where: { id: params.id }, data: { status: "ASSIGNED" } });
  }

  // Notify shelter admins
  const admins = await prisma.shelterAdmin.findMany({
    where:  { shelterId: task.shelterId },
    select: { userId: true },
  });
  createNotifications(admins.map((a) => ({
    userId: a.userId,
    type:   "TASK_SIGNUP" as const,
    title:  "Önkéntes elvállalt egy feladatot",
    body:   `${user?.name ?? "Ismeretlen"} elvállalta: ${task.title}`,
    href:   "/dashboard/volunteers",
  }))).catch(() => {});

  return NextResponse.json(assignment, { status: 201 });
}
