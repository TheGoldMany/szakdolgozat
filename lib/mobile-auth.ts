import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtSecretKey } from "@/lib/secrets";

export interface MobileUser { id: string; role: string }

/**
 * A mobilapp `Authorization: Bearer` tokenjének ellenőrzése.
 *
 * A SZEREPKÖR AZ ADATBÁZISBÓL JÖN, NEM A TOKENBŐL. A token 30 napig él;
 * ha a szerepkört belőle hinnénk el, egy lefokozott menhelyi admin vagy
 * főadmin 30 napig megtartaná az admin jogát a mobilappban, és egy törölt
 * fiók tokenje is működne tovább. Egy lekérdezés kérésenként az ára.
 *
 * Az algoritmus rögzítve van: a token fejlécében megadott `alg`-ot nem
 * hisszük el.
 */
export async function getMobileUser(req: NextRequest): Promise<MobileUser | null> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);

  let sub: string | undefined;
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey(), { algorithms: ["HS256"] });
    sub = payload.sub;
  } catch {
    return null;
  }
  if (!sub) return null;

  const user = await prisma.user.findUnique({
    where:  { id: sub },
    select: { id: true, role: true, deletionScheduledAt: true },
  });
  // Törölt, vagy törlésre jelölt fiók tokenje nem érvényes.
  if (!user || user.deletionScheduledAt) return null;

  return { id: user.id, role: user.role };
}
