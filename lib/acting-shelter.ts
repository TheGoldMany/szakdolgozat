import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTING_SHELTER_COOKIE = "acting_shelter";

export interface ActingShelter {
  /** A ténylegesen kezelt menhely azonosítója, vagy `null` = minden menhely (super admin). */
  shelterId: string | null;
  /**
   * Az összes menhely, amelyhez a felhasználó hozzáfér.
   * Menhely adminnál a sajátjai (több is lehet), super adminnál üres tömb,
   * ami azt jelenti: nincs korlátozás.
   */
  shelterIds: string[];
  /** Igaz, ha a felhasználó szabadon válthat menhelyet (super admin). */
  canSwitch: boolean;
  /** A választható menhelyek (csak super adminnak töltjük ki). */
  options: { id: string; name: string }[];
  /** A kiválasztott menhely neve, ha van. */
  shelterName: string | null;
}

/**
 * Feloldja, hogy a kérés melyik menhely nevében fut.
 *
 * - `SHELTER_ADMIN`: mindig a saját menhelye, váltás nélkül.
 * - `SUPER_ADMIN`: a `shelterId` paraméter, különben a korábban kiválasztott
 *   (süti), különben `null` = az összes menhely együtt.
 *
 * Így minden menhelyhez kötött oldal ugyanazt a szabályt követi.
 */
export async function resolveActingShelter(
  userId: string,
  role: string | undefined,
  requestedShelterId?: string | null,
): Promise<ActingShelter> {
  if (role !== "SUPER_ADMIN") {
    // Egy admin több menhelyhez is tartozhat – mindet visszaadjuk, hogy az
    // összesítő oldalak ne szűküljenek le az elsőre.
    const memberships = await prisma.shelterAdmin.findMany({
      where:  { userId },
      select: { shelterId: true, shelter: { select: { id: true, name: true } } },
      orderBy: { shelter: { name: "asc" } },
    });
    if (memberships.length === 0) {
      return { shelterId: null, shelterIds: [], canSwitch: false, options: [], shelterName: null };
    }

    const options = memberships.map((m) => m.shelter);
    // Több menhely esetén a korábban választott (süti) az aktív, különben az első
    const cookieStore = await cookies();
    const fromCookie  = cookieStore.get(ACTING_SHELTER_COOKIE)?.value ?? null;
    const candidate   = requestedShelterId ?? fromCookie;
    const selected    = options.find((o) => o.id === candidate) ?? options[0];

    return {
      shelterId:   selected.id,
      shelterIds:  options.map((o) => o.id),
      canSwitch:   options.length > 1,
      options,
      shelterName: selected.name,
    };
  }

  const options = await prisma.shelter.findMany({
    where:   { isActive: true },
    select:  { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const cookieStore = await cookies();
  const fromCookie  = cookieStore.get(ACTING_SHELTER_COOKIE)?.value ?? null;
  const candidate   = requestedShelterId ?? fromCookie;

  // Csak létező, aktív menhelyet fogadunk el (törölt/elavult süti ne törje el az oldalt)
  const selected = candidate ? options.find((o) => o.id === candidate) ?? null : null;

  return {
    shelterId:   selected?.id ?? null,
    shelterIds:  [], // super admin: nincs korlátozás
    canSwitch:   true,
    options,
    shelterName: selected?.name ?? null,
  };
}
