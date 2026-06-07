import { EventType, EventStatus } from "@prisma/client";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  ADOPTION_DAY:  "Örökbefogadási nap",
  FUNDRAISER:    "Adománygyűjtés",
  VOLUNTEER_DAY: "Önkéntes nap",
  OPEN_DAY:      "Nyílt nap",
  EDUCATION:     "Oktatás / előadás",
  OTHER:         "Egyéb",
};
export const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  ADOPTION_DAY:  "bg-brand-50 text-brand-700 border-brand-200",
  FUNDRAISER:    "bg-pink-50 text-pink-700 border-pink-200",
  VOLUNTEER_DAY: "bg-amber-50 text-amber-700 border-amber-200",
  OPEN_DAY:      "bg-sky-50 text-sky-700 border-sky-200",
  EDUCATION:     "bg-purple-50 text-purple-700 border-purple-200",
  OTHER:         "bg-gray-100 text-gray-600 border-gray-200",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT:     "Vázlat",
  PUBLISHED: "Közzétéve",
  CANCELLED: "Lemondva",
  COMPLETED: "Lezárult",
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT:     "bg-gray-100 text-gray-500 border-gray-200",
  PUBLISHED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  COMPLETED: "bg-blue-50 text-blue-600 border-blue-200",
};

/** Ékezetmentes, URL-barát slug generálása szövegből. */
export function slugifyEvent(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
