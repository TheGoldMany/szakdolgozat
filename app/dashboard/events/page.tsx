import { redirect } from "next/navigation";
import { CalendarHeart } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageInfo } from "@/components/dashboard/page-info";
import { EventsManager } from "@/components/events/events-manager";
import type { EventEntry } from "@/components/events/events-manager";

export const metadata: Metadata = { title: "Események" };
export const dynamic = "force-dynamic";

export default async function DashboardEventsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

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

  const events = await prisma.event.findMany({
    where:   { shelterId: { in: shelterIds } },
    orderBy: { startsAt: "desc" },
    include: {
      registrations: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  const serialized: EventEntry[] = events.map(ev => ({
    id:          ev.id,
    title:       ev.title,
    slug:        ev.slug,
    description: ev.description,
    type:        ev.type,
    location:    ev.location,
    startsAt:    ev.startsAt.toISOString(),
    endsAt:      ev.endsAt?.toISOString() ?? null,
    capacity:    ev.capacity,
    imageUrl:    ev.imageUrl,
    status:      ev.status,
    registrations: ev.registrations.map(r => ({
      id:        r.id,
      status:    r.status,
      guests:    r.guests,
      note:      r.note,
      createdAt: r.createdAt.toISOString(),
      user:      { name: r.user.name, email: r.user.email },
    })),
  }));

  const upcoming = events.filter(e => e.status === "PUBLISHED" && e.startsAt >= new Date()).length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <CalendarHeart className="h-6 w-6 text-brand-500" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Események</h1>
            <PageInfo page="events" />
          </div>
          <p className="text-sm text-gray-500">
            {events.length} esemény &bull; {upcoming} közelgő, meghirdetett
          </p>
        </div>
      </div>

      <EventsManager shelterId={shelterId} events={serialized} />
    </div>
  );
}
