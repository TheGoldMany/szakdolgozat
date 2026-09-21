import type { EventItem } from "./api";

/**
 * Esemény-segédek.
 *
 * A címkék a webes `lib/event.ts` magyar szövegeivel EGYEZNEK, hogy aki
 * mindkettőt látja, ugyanazt olvassa. A színek viszont nem vihetők át: ott
 * Tailwind osztálynevek vannak, itt hexakód kell.
 */

export const EVENT_TYPE_LABELS: Record<string, string> = {
  ADOPTION_DAY:  "Örökbefogadási nap",
  FUNDRAISER:    "Adománygyűjtés",
  VOLUNTEER_DAY: "Önkéntes nap",
  OPEN_DAY:      "Nyílt nap",
  EDUCATION:     "Oktatás / előadás",
  OTHER:         "Egyéb",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT:     "Vázlat",
  PUBLISHED: "Közzétéve",
  CANCELLED: "Lemondva",
  COMPLETED: "Lezárult",
};

/** Dátum és időpont egy sorban, magyarul. */
export function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Szabad helyek. `null`, ha nincs korlát.
 *
 * A `takenSpots`-ot használja, NEM a `_count.registrations`-t: a kapacitást a
 * jelentkező és a kísérői EGYÜTT töltik ki. A fejek számával egy 3 férőhelyes,
 * egy háromfős jelentkezéssel telt esemény „2 szabad hely"-et mutatna, és a
 * felhasználó csak a beküldéskor tudná meg, hogy betelt.
 */
export function freeSpots(event: EventItem): number | null {
  if (event.capacity == null) return null;
  return Math.max(0, event.capacity - event.takenSpots);
}

/** Jelentkezhet-e még erre az eseményre? */
export function canRegister(event: EventItem): boolean {
  if (event.status !== "PUBLISHED") return false;
  if (new Date(event.startsAt) < new Date()) return false;
  const free = freeSpots(event);
  return free === null || free > 0;
}

/** Aktív-e a saját jelentkezésem? A lemondott sor megmarad, de nem számít. */
export function isRegistered(event: EventItem): boolean {
  return event.registration?.status === "REGISTERED";
}
