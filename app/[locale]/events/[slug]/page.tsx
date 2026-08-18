import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { CalendarHeart, MapPin, Users, Clock, Building2 } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from "@/lib/event";
import { EventRegisterButton } from "@/components/events/event-register-button";
import { ShareButton } from "@/components/ui/share-button";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await prisma.event.findUnique({ where: { slug: params.slug }, select: { title: true } });
  return { title: event ? event.title : "Esemény" };
}

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("events");

  const event = await prisma.event.findUnique({
    where:   { slug: params.slug },
    include: {
      shelter: { select: { name: true, city: true, slug: true } },
      _count:  { select: { registrations: { where: { status: "REGISTERED" } } } },
    },
  });

  if (!event || event.status === "DRAFT") notFound();

  // Head count incl. guests
  const agg = await prisma.eventRegistration.aggregate({
    where: { eventId: event.id, status: "REGISTERED" },
    _sum:  { guests: true },
    _count:{ id: true },
  });
  const headCount = agg._count.id + (agg._sum.guests ?? 0);
  const isFull    = event.capacity != null && headCount >= event.capacity;
  const isPast    = event.startsAt < new Date();
  const canRegister = event.status === "PUBLISHED" && !isPast;

  let myReg: { status: string; guests: number } | null = null;
  if (session?.user?.id) {
    const r = await prisma.eventRegistration.findUnique({
      where:  { eventId_userId: { eventId: event.id, userId: session.user.id } },
      select: { status: true, guests: true },
    });
    myReg = r && r.status === "REGISTERED" ? r : null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-52 w-full overflow-hidden bg-gradient-to-r from-brand-400 to-brand-600 sm:h-64">
        {event.imageUrl && <Image src={event.imageUrl} alt={event.title} fill className="object-cover opacity-60" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-400">
          <Link href="/events" className="hover:text-brand-500 transition-colors">{t("breadcrumb")}</Link>
          <span>›</span>
          <span className="text-gray-600">{event.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main */}
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${EVENT_TYPE_COLORS[event.type]}`}>
                {EVENT_TYPE_LABELS[event.type]}
              </span>
              <ShareButton url={`/events/${event.slug}`} title={`${event.title} – ÁllatiMenhelyek.hu`} />
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl text-gray-900">{event.title}</h1>

            {event.status === "CANCELLED" && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {t("cancelledNotice")}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">{t("aboutEvent")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{event.description}</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2.5">
                  <CalendarHeart className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>{new Date(event.startsAt).toLocaleString("hu-HU", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </li>
                {event.endsAt && (
                  <li className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    <span>{t("endsAt")} {new Date(event.endsAt).toLocaleString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                )}
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>{event.location}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <Link href={`/shelters/${event.shelter.slug}`} className="hover:text-brand-500">
                    {event.shelter.name} · {event.shelter.city}
                  </Link>
                </li>
                <li className="flex items-start gap-2.5">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                  <span>{event.capacity != null ? `${headCount} / ${event.capacity}` : t("participants", { count: headCount })}</span>
                </li>
              </ul>
            </div>

            {canRegister ? (
              <EventRegisterButton
                eventId={event.id}
                slug={event.slug}
                loggedIn={!!session?.user?.id}
                isFull={isFull && !myReg}
                registered={!!myReg}
                initialGuests={myReg?.guests ?? 0}
              />
            ) : isPast ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center text-sm font-medium text-gray-500">
                {t("pastNotice")}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
