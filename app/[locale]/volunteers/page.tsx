import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VolunteerDashboard } from "@/components/volunteers/volunteer-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Önkéntességem" };
export const dynamic = "force-dynamic";

export default async function VolunteersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/volunteers");

  const volunteers = await prisma.volunteer.findMany({
    where:   { userId: session.user.id },
    include: {
      shelter:     { select: { id: true, name: true, slug: true, city: true } },
      assignments: {
        include: { task: { select: { id: true, title: true, description: true, scheduledAt: true, status: true, shelterId: true } } },
      },
      attendances: { orderBy: { date: "desc" }, take: 20 },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeShelterIds = volunteers
    .filter((v) => v.status === "ACTIVE")
    .map((v) => v.shelterId);

  const availableTasks = activeShelterIds.length > 0
    ? await prisma.volunteerTask.findMany({
        where: {
          shelterId:   { in: activeShelterIds },
          status:      "OPEN",
          scheduledAt: { gte: new Date() },
        },
        include: {
          shelter:     { select: { name: true } },
          assignments: { select: { volunteer: { select: { userId: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  const serialized = {
    volunteers: volunteers.map((v) => ({
      ...v,
      createdAt:   v.createdAt.toISOString(),
      updatedAt:   v.updatedAt.toISOString(),
      assignments: v.assignments.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        task: { ...a.task, scheduledAt: a.task.scheduledAt.toISOString() },
      })),
      attendances: v.attendances.map((att) => ({
        ...att,
        date:      att.date.toISOString(),
        createdAt: att.createdAt.toISOString(),
      })),
    })),
    availableTasks: availableTasks.map((t) => ({
      ...t,
      scheduledAt: t.scheduledAt.toISOString(),
      createdAt:   t.createdAt.toISOString(),
      updatedAt:   t.updatedAt.toISOString(),
    })),
    userId: session.user.id,
  };

  return <VolunteerDashboard data={serialized} />;
}
