import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { ShelterAppointments } from "@/components/appointments/shelter-appointments";

export const metadata: Metadata = { title: "Időpontok" };
export const dynamic = "force-dynamic";

export default async function DashboardAppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  const t = await getTranslations("appointments");

  let shelterIds: string[];

  if (session.user.role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    shelterIds = all.map(s => s.id);
  } else {
    const adminOf = await prisma.shelterAdmin.findMany({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    shelterIds = adminOf.map(a => a.shelterId);
    if (shelterIds.length === 0) redirect("/dashboard");
  }

  const appointments = await prisma.appointment.findMany({
    where:   { shelterId: { in: shelterIds } },
    orderBy: { proposedAt: "asc" },
    include: {
      user:    { select: { name: true, email: true, phone: true } },
      animal:  { select: { name: true, slug: true } },
      shelter: { select: { name: true } },
    },
  });

  const serialized = appointments.map(a => ({
    ...a,
    proposedAt:  a.proposedAt.toISOString(),
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    createdAt:   a.createdAt.toISOString(),
    updatedAt:   a.updatedAt.toISOString(),
  }));

  const pending = serialized.filter(a => a.status === "PENDING").length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-brand-500" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h1>
            <PageInfo page="appointments" />
          </div>
          {pending > 0 && (
            <p className="text-sm text-amber-600 font-medium">{t("pendingNotice", { count: pending })}</p>
          )}
        </div>
      </div>

      <ShelterAppointments initial={serialized as Parameters<typeof ShelterAppointments>[0]["initial"]} />
    </div>
  );
}
