import { KennelType } from "@prisma/client";

export const KENNEL_TYPE_LABELS: Record<KennelType, string> = {
  KENNEL:     "Kennel",
  CAT_ROOM:   "Macskaszoba",
  QUARANTINE: "Karantén",
  AVIARY:     "Madárház",
  OUTDOOR:    "Kültéri kifutó",
  OTHER:      "Egyéb",
};

export const ALL_KENNEL_TYPES = Object.keys(KENNEL_TYPE_LABELS) as KennelType[];
