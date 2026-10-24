import { prisma } from "./prisma";
import { geocodeAddress } from "./geo";

/**
 * Bejelentés koordinátái a település / cím alapján.
 *
 * A térkép és a közeli menhelyek értesítése is koordinátát vár, a bejelentő
 * viszont nem mindig jelöli meg a helyet a térképen: weben a helyválasztó
 * opcionális, a mobilappban pedig csak a várost lehet beírni. Ilyenkor a
 * bejelentés eddig koordináta nélkül mentődött, és SOHA nem jelent meg a
 * térképen. A hiányzó pontot a meglévő geokódolóval pótoljuk (Nominatim, ha
 * az nem talál, a város középpontja).
 */
export async function geocodeReportLocation(input: {
  lat?:     number | null;
  lng?:     number | null;
  city?:    string | null;
  address?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  if (input.lat != null && input.lng != null) return { lat: input.lat, lng: input.lng };
  if (!input.city?.trim() && !input.address?.trim()) return null;
  return geocodeAddress({ city: input.city, address: input.address });
}

let lastBackfill = 0;
const BACKFILL_INTERVAL_MS = 10 * 60_000;

/**
 * A már elmentett, koordináta nélküli bejelentések pótlása.
 *
 * Kötegenként kevés sor: a Nominatim használati feltétele legfeljebb egy kérés
 * másodpercenként, és a hívó (térkép-lekérés) nem várhat rá sokáig. A sorból
 * csak a `lat`/`lng` változik, semmi más.
 */
export async function backfillReportCoords(limit = 5): Promise<number> {
  // Egy példányon legfeljebb 10 percenként: ami nem azonosítható, az minden
  // térkép-megnyitáskor újra a Nominatimot terhelné.
  const now = Date.now();
  if (now - lastBackfill < BACKFILL_INTERVAL_MS) return 0;
  lastBackfill = now;

  const missing = await prisma.animalReport.findMany({
    where:   { OR: [{ lat: null }, { lng: null }], city: { not: "" } },
    select:  { id: true, city: true, address: true },
    orderBy: { createdAt: "desc" },
    take:    limit,
  });

  let fixed = 0;
  for (const r of missing) {
    const coords = await geocodeAddress({ city: r.city, address: r.address });
    if (!coords) continue;
    await prisma.animalReport.update({ where: { id: r.id }, data: { lat: coords.lat, lng: coords.lng } });
    fixed++;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return fixed;
}
