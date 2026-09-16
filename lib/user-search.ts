import { prisma } from "@/lib/prisma";

/**
 * Felhasználók keresése név szerint.
 *
 * Adatvédelmi döntések, amiket érdemes tudni:
 *
 * • CSAK NÉV szerint keresünk, e-mail szerint SOHA. Az e-mailes keresés
 *   címlistát ad annak, aki végigpróbálja a találgatást: „van-e fiókja ezzel a
 *   címmel" — ez pontosan az a kérdés, amire nem szabad válaszolni.
 * • Bejelentkezés kell hozzá (a végpont kényszeríti ki), hogy a névsor ne
 *   legyen kívülről lekérdezhető.
 * • Legalább két karakter, különben egyetlen betűvel végig lehetne pörgetni a
 *   teljes felhasználói kört.
 * • A felfüggesztett és a törlésre jelölt fiókok nem jelennek meg.
 * • A találatok száma felülről zárt, tehát tömeges letöltésre nem használható.
 */

export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS      = 20;

export interface UserSearchHit {
  id:    string;
  name:  string | null;
  image: string | null;
  city:  string | null;
  role:  string;
}

export async function searchUsers(
  query: string,
  /** A kereső saját azonosítója – önmagát ne találja meg. */
  excludeUserId: string,
  limit = MAX_RESULTS,
): Promise<UserSearchHit[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  return prisma.user.findMany({
    where: {
      id:                  { not: excludeUserId },
      name:                { contains: q, mode: "insensitive" },
      suspendedAt:         null,
      deletionScheduledAt: null,
    },
    select: { id: true, name: true, image: true, city: true, role: true },
    orderBy: { name: "asc" },
    take: Math.min(limit, MAX_RESULTS),
  });
}
