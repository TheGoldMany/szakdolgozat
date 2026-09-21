import type { AnimalTypeValue } from "./api";

/**
 * Önkéntesség és ideiglenes befogadás — közös címkék.
 *
 * A két funkció státuszkészlete a sémában KÜLÖN enum (`VolunteerStatus` és
 * `FosterStatus`), de a négy érték ugyanaz, és a felhasználónak ugyanazt
 * jelenti. Ezért egy leképezés — ha valamelyik elágazik, itt kell kettévágni.
 */
export const HELP_STATUS_LABELS: Record<string, string> = {
  PENDING:  "Elbírálás alatt",
  ACTIVE:   "Aktív",
  INACTIVE: "Inaktív",
  REJECTED: "Elutasítva",
};

export const HELP_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING:  { bg: "#FEF3C7", fg: "#B45309" },
  ACTIVE:   { bg: "#D1FAE5", fg: "#065F46" },
  INACTIVE: { bg: "#F3F4F6", fg: "#4B5563" },
  REJECTED: { bg: "#FEE2E2", fg: "#B91C1C" },
};

/** A séma `AnimalType` magyar nevei — ugyanaz, mint a webes `lib/foster.ts`-ben. */
export const ANIMAL_TYPE_LABELS: Record<AnimalTypeValue, string> = {
  DOG:    "Kutya",
  CAT:    "Macska",
  RABBIT: "Nyúl",
  BIRD:   "Madár",
  OTHER:  "Egyéb",
};

/**
 * Az üres lista jelentése: BÁRMILYEN állat.
 *
 * A sémában a `preferredTypes` alapértéke üres tömb, és a megjegyzés szerint
 * „üres = bármi". Ha ezt a felület „nincs megadva"-ként mutatná, a menhely
 * félreértené, és a felhasználó azt hinné, hogy hiányosan töltötte ki.
 */
export function preferredTypesLabel(types: AnimalTypeValue[]): string {
  if (types.length === 0) return "Bármilyen állat";
  return types.map((t) => ANIMAL_TYPE_LABELS[t] ?? t).join(", ");
}
