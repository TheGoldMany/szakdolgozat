import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** True, ha a felhasználó fiókja fel van függesztve. */
export async function isUserSuspended(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { suspendedAt: true },
  });
  return !!user?.suspendedAt;
}

/**
 * Mutáló API-végpontokhoz: 403 választ ad, ha a felhasználó fel van függesztve,
 * különben `null`-t (a hívó folytathatja). Felfüggesztett fiók csak böngészhet.
 */
export async function blockIfSuspended(userId: string): Promise<NextResponse | null> {
  if (await isUserSuspended(userId)) {
    return NextResponse.json(
      { error: "A fiókod fel van függesztve, ezért ez a művelet nem érhető el. Vedd fel a kapcsolatot az üzemeltetővel." },
      { status: 403 }
    );
  }
  return null;
}
