/**
 * A kennel felszereltség-ellenőrzőlistája.
 *
 * Egy helyen definiálva, hogy az űrlap, a lista és az API validáció
 * ugyanazt a mezőkészletet használja.
 */
export const KENNEL_FACILITIES = [
  { key: "isCovered",   label: "Fedett",         icon: "🏠" },
  { key: "isFenced",    label: "Kerített",       icon: "🚧" },
  { key: "hasFeeder",   label: "Etető",          icon: "🍽️" },
  { key: "hasWaterer",  label: "Itató",          icon: "💧" },
  { key: "hasHouse",    label: "Kutyaház",       icon: "🛖" },
  { key: "hasBedding",  label: "Fekhely",        icon: "🛏️" },
  { key: "hasHeating",  label: "Fűtés",          icon: "🔥" },
  { key: "hasLighting", label: "Világítás",      icon: "💡" },
  { key: "hasDrainage", label: "Vízelvezetés",   icon: "🚿" },
  { key: "hasToys",     label: "Játékok",        icon: "🧸" },
] as const;

export type KennelFacilityKey = (typeof KENNEL_FACILITIES)[number]["key"];

export const KENNEL_FACILITY_KEYS = KENNEL_FACILITIES.map((f) => f.key) as readonly KennelFacilityKey[];

/** A felszereltség-mezők alapértelmezett (mind hamis) állapota. */
export function emptyFacilities(): Record<KennelFacilityKey, boolean> {
  return Object.fromEntries(KENNEL_FACILITY_KEYS.map((k) => [k, false])) as Record<KennelFacilityKey, boolean>;
}
