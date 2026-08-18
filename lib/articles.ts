import { prisma } from "@/lib/prisma";

/** Cikk címéből URL-barát azonosító (ékezetek feloldva). */
export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return base || "cikk";
}

/**
 * Ütközésmentes slug: ha a kívánt már foglalt, sorszámot fűz hozzá.
 * Így két azonos című cikk sem írja felül egymás URL-jét.
 */
export async function uniqueArticleSlug(base: string, ignoreId?: string): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const existing = await prisma.post.findUnique({
      where:  { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${i}`;
  }
  // Nagyon ritka ütközés esetén időbélyeggel garantáljuk az egyediséget
  return `${base}-${Date.now().toString(36)}`;
}

/** Nagyjából hány perc olvasni – a cikk-listákon segít a döntésben. */
export function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Nyilvánosan látható cikkek szűrője.
 *
 * A `publishedAt` háromféle állapotot fed le:
 *   - `null`            → piszkozat
 *   - jövőbeli időpont  → időzítve, még nem látszik
 *   - múltbeli időpont  → publikált
 *
 * A `lte` egyszerre zárja ki a piszkozatot és az időzítettet, ezért minden
 * publikus lekérdezés ezt használja.
 */
export function publishedWhere() {
  return { publishedAt: { lte: new Date() } };
}

/**
 * Egy konkrét cikk látható-e a látogatóknak.
 * Típusőr, hogy az ellenőrzés után a hívó oldalon a dátum már nem `null`.
 */
export function isPublished(publishedAt: Date | null): publishedAt is Date {
  return publishedAt !== null && publishedAt.getTime() <= Date.now();
}

/** Időzített (jövőbeli publikálású) cikk-e. */
export function isScheduled(publishedAt: Date | null): boolean {
  return publishedAt !== null && publishedAt.getTime() > Date.now();
}
