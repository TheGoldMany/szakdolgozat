/**
 * A kennel felszereltség-ellenőrzőlistája.
 *
 * Egy helyen definiálva, hogy az űrlap, a lista és az API validáció
 * ugyanazt a mezőkészletet használja.
 */
export const KENNEL_FACILITIES = [
  { key: "isCovered",   label: "Fedett" },
  { key: "isFenced",    label: "Kerített" },
  { key: "hasFeeder",   label: "Etető" },
  { key: "hasWaterer",  label: "Itató" },
  { key: "hasHouse",    label: "Kutyaház" },
  { key: "hasBedding",  label: "Fekhely" },
  { key: "hasHeating",  label: "Fűtés" },
  { key: "hasLighting", label: "Világítás" },
  { key: "hasDrainage", label: "Vízelvezetés" },
  { key: "hasToys",     label: "Játékok" },
] as const;

export type KennelFacilityKey = (typeof KENNEL_FACILITIES)[number]["key"];

export const KENNEL_FACILITY_KEYS = KENNEL_FACILITIES.map((f) => f.key) as readonly KennelFacilityKey[];

/** A felszereltség-mezők alapértelmezett (mind hamis) állapota. */
export function emptyFacilities(): Record<KennelFacilityKey, boolean> {
  return Object.fromEntries(KENNEL_FACILITY_KEYS.map((k) => [k, false])) as Record<KennelFacilityKey, boolean>;
}
