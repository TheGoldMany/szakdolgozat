import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";
import { publicEvents } from "@/lib/public-shapes";

/**
 * GET /api/events/public – közzétett, közelgő események.
 *
 * MIÉRT KÜLÖN ÚTVONAL: a `/api/events` a menhely adminé — a saját menhelye
 * eseményeit adja, vázlatokkal együtt, és csak böngésző-munkamenetet fogad el.
 * A publikus lista eddig csak szerverkomponensként létezett, tehát az appnak
 * nem volt mit hívnia.
 *
 * Bejelentkezés NEM kell. Ha viszont van, minden eseményhez megy a saját
 * jelentkezés állapota is — enélkül a lista nem tudná, melyik gombot mutassa,
 * és eseményenként külön kérdést kellene feltenni.
 */
export async function GET(req: NextRequest) {
  try {
    const events = await publicEvents();
    if (events.length === 0) return NextResponse.json({ events: [] });

    const eventIds = events.map((e) => e.id);

    /**
     * A ténylegesen elfoglalt helyek.
     *
     * A `_count.registrations` csak a FEJEKET számolja, a kapacitást viszont a
     * jelentkező ÉS a kísérői együtt töltik ki — a jelentkezés végpontja is
     * így ellenőrzi. Enélkül egy 3 férőhelyes, telt esemény „2 szabad hely"-et
     * mutatna, és a felhasználó a beküldéskor ütközne bele.
     */
    const taken = await prisma.eventRegistration.groupBy({
      by:     ["eventId"],
      where:  { eventId: { in: eventIds }, status: "REGISTERED" },
      _count: { _all: true },
      _sum:   { guests: true },
    });
    const takenByEvent = new Map(
      taken.map((t) => [t.eventId, t._count._all + (t._sum.guests ?? 0)]),
    );

    const authUser = await getAuthUser(req);
    // Egy kérdésben az összes saját jelentkezés, nem eseményenként egy.
    const regs = authUser
      ? await prisma.eventRegistration.findMany({
          where:  { userId: authUser.id, eventId: { in: eventIds } },
          select: { eventId: true, status: true, guests: true },
        })
      : [];
    const byEvent = new Map(regs.map((r) => [r.eventId, r]));

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        takenSpots:   takenByEvent.get(e.id) ?? 0,
        registration: byEvent.get(e.id) ?? null,
      })),
    });
  } catch (error) {
    console.error("[api/events/public GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
