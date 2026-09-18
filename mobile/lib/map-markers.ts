import type { MapData, MapReport, MapShelter, MapVet } from "./api";

/**
 * A térkép jelölői.
 *
 * MIÉRT KÜLÖN FÁJL: a jelölők összeállítása és a koppintás visszafejtése
 * ugyanaz a logika, de a KÉT platform két különböző komponenst renderel
 * (Androidon Google Maps, iOS-en Apple Maps — az `expo-maps`-nek nincs közös
 * `MapView`-ja). Ha a képernyőben lenne, kétszer kellene megírni.
 *
 * Az azonosító `"réteg:id"` alakú, mert a `onMarkerClick` CSAK az azonosítót
 * adja vissza — ebből kell megtalálni, melyik sorra kattintottak. Három külön
 * listában ugyanaz az azonosító előfordulhat, ezért kell az előtag.
 */

export type MarkerLayer = "shelter" | "report" | "vet";

export type MapEntity =
  | { layer: "shelter"; data: MapShelter }
  | { layer: "report";  data: MapReport }
  | { layer: "vet";     data: MapVet };

export interface SimpleMarker {
  id: string;
  coordinates: { latitude: number; longitude: number };
  title: string;
  /** Csak az Android térkép mutatja a buborékban; iOS-en nincs megfelelője. */
  snippet?: string;
  /** Apple jelölő színe. Androidon nincs színezhető jelölő, ezért ott kimarad. */
  tintColor: string;
}

/** A bejelentés típusának magyar neve. */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  LOST:  "Elveszett",
  FOUND: "Talált",
  STRAY: "Kóbor",
};

/** A séma `AnimalType` értékei — pontosan ez az öt van, nincs több. */
export const ANIMAL_TYPE_LABELS: Record<string, string> = {
  DOG: "kutya", CAT: "macska", RABBIT: "nyúl", BIRD: "madár", OTHER: "egyéb",
};

/**
 * Rétegszínek.
 *
 * Ugyanaz a három szín, amit a webes térkép használ, hogy aki mindkettőt
 * látja, ne kelljen újratanulnia a jelentésüket.
 */
export const LAYER_COLORS: Record<MarkerLayer, string> = {
  shelter: "#2563EB",
  report:  "#EF4444",
  vet:     "#059669",
};

export const LAYER_LABELS: Record<MarkerLayer, string> = {
  shelter: "Menhelyek",
  report:  "Bejelentések",
  vet:     "Állatorvosok",
};

function reportTitle(r: MapReport): string {
  const type   = REPORT_TYPE_LABELS[r.type] ?? r.type;
  const animal = ANIMAL_TYPE_LABELS[r.animalType] ?? "állat";
  // A névtelen bejelentés gyakori (talált állatnak nincs neve), ezért a
  // fajta vagy az állatfaj lép a helyére – üres cím semmit nem mondana.
  return `${type} ${r.name ?? r.breed ?? animal}`;
}

/**
 * A látható rétegekből egyetlen jelölőlista.
 *
 * @param visible mely rétegek legyenek rajta – a szűrő így nem kér új adatot
 *   a szervertől, csak elhagyja a jelölőket
 */
export function buildMarkers(data: MapData, visible: Record<MarkerLayer, boolean>): SimpleMarker[] {
  const markers: SimpleMarker[] = [];

  if (visible.shelter) {
    for (const s of data.shelters) {
      markers.push({
        id:          `shelter:${s.id}`,
        coordinates: { latitude: s.lat, longitude: s.lng },
        title:       s.name,
        snippet:     `${s.city} · ${s._count.animals} örökbefogadható`,
        tintColor:   LAYER_COLORS.shelter,
      });
    }
  }

  if (visible.report) {
    for (const r of data.reports) {
      markers.push({
        id:          `report:${r.id}`,
        coordinates: { latitude: r.lat, longitude: r.lng },
        title:       reportTitle(r),
        snippet:     r.city,
        tintColor:   LAYER_COLORS.report,
      });
    }
  }

  if (visible.vet) {
    for (const v of data.vets) {
      markers.push({
        id:          `vet:${v.id}`,
        coordinates: { latitude: v.lat, longitude: v.lng },
        title:       v.name,
        snippet:     v.isEmergency ? `${v.city} · ügyelet` : v.city,
        tintColor:   LAYER_COLORS.vet,
      });
    }
  }

  return markers;
}

/** Melyik sorra koppintottak? `null`, ha időközben eltűnt (szűrőváltás). */
export function findEntity(data: MapData, markerId: string | undefined): MapEntity | null {
  if (!markerId) return null;
  const sep = markerId.indexOf(":");
  if (sep < 0) return null;

  const layer = markerId.slice(0, sep) as MarkerLayer;
  const id    = markerId.slice(sep + 1);

  if (layer === "shelter") {
    const data_ = data.shelters.find((s) => s.id === id);
    return data_ ? { layer, data: data_ } : null;
  }
  if (layer === "report") {
    const data_ = data.reports.find((r) => r.id === id);
    return data_ ? { layer, data: data_ } : null;
  }
  if (layer === "vet") {
    const data_ = data.vets.find((v) => v.id === id);
    return data_ ? { layer, data: data_ } : null;
  }
  return null;
}

/**
 * Kezdő nézet: Magyarország közepe.
 *
 * Nem a felhasználó helyzete, mert az app SZÁNDÉKOSAN nem kér helyadatot
 * (lásd docs/20 adatkezelési lista). Egy fix, az egész országot mutató nézet
 * ugyanolyan használható kiindulás, és nem jár engedélykéréssel.
 */
export const INITIAL_CAMERA = {
  coordinates: { latitude: 47.18, longitude: 19.5 },
  zoom: 6,
};
