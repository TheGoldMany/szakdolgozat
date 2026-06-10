import { redirect } from "next/navigation";
import { HandHeart } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { ExportButton } from "@/components/dashboard/export-button";
import { prisma } from "@/lib/prisma";
import { ShelterVolunteers } from "@/components/volunteers/shelter-volunteers";
import type { VolunteerEntry, TaskEntry } from "@/components/volunteers/shelter-volunteers";

export const metadata: Metadata = { title: "Önkéntesek" };
export const dynamic = "force-dynamic";

export default async function DashboardVolunteersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  const t = await getTranslations("dashboard");

  let shelterIds: string[];

  if (session.user.role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    shelterIds = all.map(s => s.id);
  } else {
    const admins = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id }, select: { shelterId: true },
    });
    shelterIds = admins.map(a => a.shelterId);
    if (shelterIds.length === 0) redirect("/dashboard");
  }

  const shelterId = shelterIds[0];

  const [volunteers, tasks] = await Promise.all([
    prisma.volunteer.findMany({
      where:   { shelterId: { in: shelterIds } },
      orderBy: { createdAt: "desc" },
      include: {
        user:        { select: { name: true, email: true, phone: true } },
        attendances: { orderBy: { date: "desc" }, take: 10 },
        assignments: { include: { task: { select: { title: true, scheduledAt: true, status: true } } } },
      },
    }),
    prisma.volunteerTask.findMany({
      where:   { shelterId: { in: shelterIds } },
      orderBy: { scheduledAt: "asc" },
      include: {
        assignments: {
          include: { volunteer: { include: { user: { select: { name: true, email: true } } } } },
        },
      },
    }),
  ]);

  const serializeVol = (v: typeof volunteers[0]): VolunteerEntry => ({
    id:           v.id,
    status:       v.status,
    motivation:   v.motivation,
    skills:       v.skills,
    availability: v.availability,
    adminNote:    v.adminNote,
    createdAt:    v.createdAt.toISOString(),
    user:         { name: v.user.name, email: v.user.email, phone: v.user.phone },
    attendances:  v.attendances.map(a => ({ id: a.id, date: a.date.toISOString(), hours: a.hours, note: a.note })),
    assignments:  v.assignments.map(a => ({
      task: { title: a.task.title, scheduledAt: a.task.scheduledAt.toISOString(), status: a.task.status },
    })),
  });

  const serializeTask = (t: typeof tasks[0]): TaskEntry => ({
    id:            t.id,
    title:         t.title,
    description:   t.description,
    scheduledAt:   t.scheduledAt.toISOString(),
    maxVolunteers: t.maxVolunteers,
    status:        t.status,
    assignments:   t.assignments.map(a => ({
      volunteer: { user: { name: a.volunteer.user.name, email: a.volunteer.user.email } },
    })),
  });

  const totalHours = volunteers
    .filter(v => v.status === "ACTIVE")
    .flatMap(v => v.attendances)
    .reduce((s, a) => s + a.hours, 0);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <HandHeart className="h-6 w-6 text-brand-500" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t("volunteersPageTitle")}</h1>
            <PageInfo page="volunteers" />
          </div>
          <p className="text-sm text-gray-500">
            {t("activeVolunteers", { count: volunteers.filter(v => v.status === "ACTIVE").length })} &bull; {t("hoursCompleted", { hours: Math.round(totalHours) })}
          </p>
        </div>
        <div className="ml-auto">
          <ExportButton type="volunteers" />
        </div>
      </div>

      <ShelterVolunteers
        shelterId={shelterId}
        volunteers={volunteers.map(serializeVol)}
        tasks={tasks.map(serializeTask)}
      />
    </div>
  );
}
