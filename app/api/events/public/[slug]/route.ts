import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";
import { publicEvent } from "@/lib/public-shapes";

/**
 * GET /api/events/public/[slug] – egy esemény publikus alakja.
 *
 * Azonosítót ÉS slugot is elfogad (`idOrSlug`), mert az értesítések webes
 * hivatkozása slugot tartalmaz (`/events/{slug}`), a listából viszont
 * azonosítóval kényelmesebb tovább lépni.
 *
 * Bejelentkezve a saját jelentkezés állapota is jön: a részletező ebből tudja,
 * hogy a „Jelentkezem" vagy a „Lemondom" gombot kell mutatnia.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const event = await publicEvent(params.slug);
    if (!event) {
      return NextResponse.json({ error: "Esemény nem található" }, { status: 404 });
    }

    // A ténylegesen elfoglalt helyek: a jelentkezők ÉS a kísérőik. A
    // `_count.registrations` csak a fejeket adja, a kapacitást viszont a
    // kettő együtt tölti ki — ugyanígy számol a jelentkezés végpontja is.
    const taken = await prisma.eventRegistration.aggregate({
      where:  { eventId: event.id, status: "REGISTERED" },
      _count: { _all: true },
      _sum:   { guests: true },
    });
    const takenSpots = taken._count._all + (taken._sum.guests ?? 0);

    const authUser = await getAuthUser(req);
    const registration = authUser
      ? await prisma.eventRegistration.findUnique({
          where:  { eventId_userId: { eventId: event.id, userId: authUser.id } },
          select: { eventId: true, status: true, guests: true },
        })
      : null;

    return NextResponse.json({ event: { ...event, takenSpots, registration } });
  } catch (error) {
    console.error("[api/events/public/[slug] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
