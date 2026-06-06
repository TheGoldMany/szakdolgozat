import { AnimalType, FosterStatus } from "@prisma/client";

export const ANIMAL_TYPE_LABELS: Record<AnimalType, string> = {
  DOG:    "Kutya",
  CAT:    "Macska",
  RABBIT: "Nyúl",
  BIRD:   "Madár",
  OTHER:  "Egyéb",
};
export const ALL_ANIMAL_TYPES = Object.keys(ANIMAL_TYPE_LABELS) as AnimalType[];

export const FOSTER_STATUS_LABELS: Record<FosterStatus, string> = {
  PENDING:  "Elbírálás alatt",
  ACTIVE:   "Aktív befogadó",
  INACTIVE: "Inaktív",
  REJECTED: "Elutasítva",
};

export const FOSTER_STATUS_COLORS: Record<FosterStatus, string> = {
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE:   "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};
