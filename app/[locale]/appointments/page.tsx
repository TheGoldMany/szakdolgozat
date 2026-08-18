import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CalendarDays } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Időpontjaim" };
export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/appointments");

  const appointments = await prisma.appointment.findMany({
    where:   { userId: session.user.id },
    orderBy: { proposedAt: "desc" },
    include: {
      shelter: { select: { name: true, city: true, slug: true } },
      animal:  { select: { name: true, slug: true } },
    },
  });

  const serialized = appointments.map(a => ({
    ...a,
    proposedAt:  a.proposedAt.toISOString(),
    confirmedAt: a.confirmedAt?.toISOString() ?? null,
    createdAt:   a.createdAt.toISOString(),
    updatedAt:   a.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Időpontjaim</h1>
        </div>

        {serialized.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">Még nincs időpontod</p>
            <p className="mt-1 text-sm text-gray-400">Látogass meg egy állatot, és kérj időpontot a menhelynél.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {serialized.map(appt => (
              <AppointmentCard key={appt.id} appt={appt as Parameters<typeof AppointmentCard>[0]["appt"]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
