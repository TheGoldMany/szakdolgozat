import { prisma } from "./prisma";
import { AnimalStatus } from "@prisma/client";

/**
 * Indexelhető-e egy listaoldal: van-e rajta egyáltalán tartalom.
 *
 * Egy „nincs találat” feliratú, üres listát a Google lágy 404-nek vagy
 * gyenge tartalomnak tekint („Feltérképezve – jelenleg nincs indexelve”),
 * és ez a négy nyelvi változaton négyszer jelentkezik. Amíg a lista üres,
 * az oldal `noindex`, és a sitemapből is kimarad. Amint felkerül az első
 * állat vagy esemény, magától újra indexelhető. A szűrők itt nem számítanak:
 * a kanonikus, szűretlen lista a mérvadó.
 */
export const availableAnimalsWhere = {
  status:  AnimalStatus.AVAILABLE,
  shelter: { is: { isActive: true } },
};

export const upcomingEventsWhere = () => ({
  status:   "PUBLISHED" as const,
  startsAt: { gte: new Date() },
});

export async function listingHasContent(): Promise<{ animals: boolean; events: boolean }> {
  const [animals, events] = await Promise.all([
    prisma.animal.count({ where: availableAnimalsWhere }),
    prisma.event.count({ where: upcomingEventsWhere() }),
  ]);
  return { animals: animals > 0, events: events > 0 };
}
