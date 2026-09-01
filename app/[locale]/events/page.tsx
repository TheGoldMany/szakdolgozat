import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { CalendarHeart, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/event";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("events") };
}
// ISR: az eseménylista 5 percenként frissül (gyors betöltés cache-ből)
export const revalidate = 300;

export default async function EventsListPage() {
  const t = await getTranslations("events");
  const events = await prisma.event.findMany({
    where:   { status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      shelter: { select: { name: true, city: true, slug: true } },
      _count:  { select: { registrations: { where: { status: "REGISTERED" } } } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
            <CalendarHeart className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-gray-900">{t("listTitle")}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{t("listSubtitle")}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <CalendarHeart className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t("empty")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(ev => (
              <Link key={ev.id} href={`/events/${ev.slug}`}
                className="press-card group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-300">
                  {ev.imageUrl
                    ? <Image src={ev.imageUrl} alt={ev.title} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width:768px) 100vw, 33vw" />
                    : <div className="flex h-full items-center justify-center"><CalendarHeart className="h-10 w-10 text-white/70" /></div>}
                  <span className={`absolute left-3 top-3 rounded-full border px-2 py-0.5 text-[11px] font-medium ${EVENT_TYPE_COLORS[ev.type]}`}>
                    {EVENT_TYPE_LABELS[ev.type]}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs font-semibold text-brand-600">
                    {new Date(ev.startsAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <h2 className="mt-1 font-bold leading-snug text-gray-900 group-hover:text-brand-600">{ev.title}</h2>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" />{ev.location}</span>
                    <span className="truncate">{ev.shelter.name} · {ev.shelter.city}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 border-t border-gray-50 pt-2 text-xs text-gray-400">
                    <Users className="h-3.5 w-3.5" />
                    {ev.capacity != null
                      ? `${ev._count.registrations} / ${ev.capacity}`
                      : t("registrants", { count: ev._count.registrations })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
