/**
 * Földrajzi segédfüggvények a bejelentés-párosításhoz.
 */

const EARTH_RADIUS_KM = 6371;

/** Két koordináta közötti távolság kilométerben (haversine). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Napokban kifejezett különbség két dátum között (abszolút érték, lefelé kerekítve). */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Cím → koordináta (forward geocoding) az OpenStreetMap Nominatim API-val.
 * Hibatűrő: bármilyen hiba esetén `null`-t ad vissza (a menhely koordináta nélkül jön létre).
 */
export async function geocodeAddress(parts: {
  address?: string | null;
  city?:    string | null;
  zipCode?: string | null;
  country?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  const query = [parts.address, parts.zipCode, parts.city, parts.country ?? "Hungary"]
    .filter(Boolean)
    .join(", ");
  if (!query.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { "User-Agent": "AllatiMenhelyek.hu/1.0 (shelter geocoding)" },
      signal:  controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
