import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const ACTING_SHELTER_COOKIE = "acting_shelter";

export interface ActingShelter {
  /** A ténylegesen kezelt menhely azonosítója, vagy `null` = minden menhely (super admin). */
  shelterId: string | null;
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
    const admin = await prisma.shelterAdmin.findFirst({
      where:  { userId },
      select: { shelterId: true, shelter: { select: { name: true } } },
    });
    return {
      shelterId:   admin?.shelterId ?? null,
      canSwitch:   false,
      options:     [],
      shelterName: admin?.shelter.name ?? null,
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
    canSwitch:   true,
    options,
    shelterName: selected?.name ?? null,
  };
}
