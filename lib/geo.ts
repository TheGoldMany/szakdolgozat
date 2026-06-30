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

/** Nagyobb magyar városok középpontjai – tartalék geokódoláshoz. */
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  budapest:           { lat: 47.497, lng: 19.040 },
  debrecen:           { lat: 47.531, lng: 21.626 },
  miskolc:            { lat: 48.103, lng: 20.779 },
  szeged:             { lat: 46.253, lng: 20.141 },
  pecs:               { lat: 46.076, lng: 18.228 },
  gyor:               { lat: 47.687, lng: 17.630 },
  nyiregyhaza:        { lat: 47.955, lng: 21.717 },
  kecskemet:          { lat: 46.896, lng: 19.688 },
  szekesfehervar:     { lat: 47.186, lng: 18.422 },
  szombathely:        { lat: 47.235, lng: 16.621 },
  szolnok:            { lat: 47.176, lng: 20.181 },
  tatabanya:          { lat: 47.586, lng: 18.395 },
  kaposvar:           { lat: 46.359, lng: 17.796 },
  bekescsaba:         { lat: 46.679, lng: 21.091 },
  erd:                { lat: 47.391, lng: 18.903 },
  veszprem:           { lat: 47.093, lng: 17.908 },
  zalaegerszeg:       { lat: 46.840, lng: 16.840 },
  sopron:             { lat: 47.685, lng: 16.591 },
  eger:               { lat: 47.902, lng: 20.377 },
  nagykanizsa:        { lat: 46.451, lng: 16.990 },
  dunaujvaros:        { lat: 46.980, lng: 18.936 },
  hodmezovasarhely:   { lat: 46.418, lng: 20.329 },
  salgotarjan:        { lat: 48.099, lng: 19.800 },
  cegled:             { lat: 47.173, lng: 19.797 },
  baja:               { lat: 46.181, lng: 18.954 },
  szekszard:          { lat: 46.348, lng: 18.704 },
  godollo:            { lat: 47.600, lng: 19.355 },
  esztergom:          { lat: 47.785, lng: 18.740 },
  papa:               { lat: 47.330, lng: 17.467 },
};

/** Ékezetek és kis/nagybetűk normalizálása városnév-egyeztetéshez. */
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "")
    .trim();
}

/** Tartalék: a város középpontja kis véletlen eltéréssel (hogy ne fedjék egymást a markerek). */
function cityCentroid(city?: string | null): { lat: number; lng: number } | null {
  if (!city) return null;
  const key = normalizeCity(city);
  const c = CITY_CENTROIDS[key];
  if (!c) return null;
  return {
    lat: c.lat + (Math.random() - 0.5) * 0.02,
    lng: c.lng + (Math.random() - 0.5) * 0.02,
  };
}

/**
 * Cím → koordináta (forward geocoding) az OpenStreetMap Nominatim API-val.
 * Ha a pontos cím nem található, a város középpontjára esik vissza.
 * Hibatűrő: csak akkor ad `null`-t, ha sem a cím, sem a város nem azonosítható.
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

  if (query.trim()) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, {
        headers: { "User-Agent": "AllatiMenhelyek.hu/1.0 (shelter geocoding)" },
        signal:  controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as { lat: string; lon: string }[];
        if (data.length) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
        }
      }
    } catch {
      /* ignoráljuk – jön a városszintű tartalék */
    }
  }

  // Tartalék: város középpontja
  return cityCentroid(parts.city);
}
