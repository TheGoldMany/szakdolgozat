import { AnimalFlag } from "@prisma/client";

/** Magyar címkék a belső viselkedési flag-ekhez */
export const FLAG_LABELS: Record<AnimalFlag, string> = {
  ESCAPE_ARTIST:           "Szökőművész",
  FOOD_AGGRESSIVE:         "Élelemirigy",
  NOT_GOOD_WITH_CHILDREN:  "Gyerekekkel nem barátságos",
  NOT_GOOD_WITH_DOGS:      "Kutyákkal nem barátságos",
  NOT_GOOD_WITH_CATS:      "Macskákkal nem barátságos",
  NEEDS_EXPERIENCED_OWNER: "Tapasztalt gazdát igényel",
  REACTIVE:                "Reaktív / ingerlékeny",
  ANXIOUS:                 "Szorongó",
  MEDICAL_NEEDS:           "Speciális orvosi ellátás",
  NO_APARTMENT:            "Lakásba nem ajánlott",
};

export const ALL_FLAGS = Object.keys(FLAG_LABELS) as AnimalFlag[];

interface ApplicantProfile {
  hasChildren?: boolean | null;
  hasPets?:     boolean | null;
  homeType?:    string | null;   // "HOUSE" | "APARTMENT" | "OTHER"
  hasGarden?:   boolean | null;
  experience?:  string | null;
}

/**
 * Összeveti az állat viselkedési flag-jeit a jelentkező válaszaival,
 * és visszaadja az ütközések emberi olvasható listáját. Üres tömb = nincs ütközés.
 */
export function detectConflicts(
  flags: AnimalFlag[],
  applicant: ApplicantProfile,
): string[] {
  const conflicts: string[] = [];

  if (flags.includes("NOT_GOOD_WITH_CHILDREN") && applicant.hasChildren) {
    conflicts.push(
      "A jelentkező háztartásában gyermek él, de az állat „Gyerekekkel nem barátságos" címkével rendelkezik.",
    );
  }

  if (
    applicant.hasPets &&
    (flags.includes("NOT_GOOD_WITH_DOGS") || flags.includes("NOT_GOOD_WITH_CATS"))
  ) {
    conflicts.push(
      "A jelentkezőnek van más háziállata, de az állat más állatokkal nehezen viseli a társaságot.",
    );
  }

  if (
    flags.includes("NO_APARTMENT") &&
    applicant.homeType === "APARTMENT"
  ) {
    conflicts.push(
      "A jelentkező lakásban él, de az állatnak kertes ingatlan ajánlott.",
    );
  }

  if (
    flags.includes("NEEDS_EXPERIENCED_OWNER") &&
    (!applicant.experience || applicant.experience.trim().length < 10)
  ) {
    conflicts.push(
      "Az állat tapasztalt gazdát igényel, de a jelentkező nem adott meg érdemi állattartási tapasztalatot.",
    );
  }

  return conflicts;
}
