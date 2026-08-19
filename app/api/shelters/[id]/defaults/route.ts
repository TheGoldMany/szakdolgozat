import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureShelterDefaults } from "@/lib/shelter-defaults";

/**
 * POST /api/shelters/[id]/defaults
 *
 * Létrehozza a menhely hiányzó fix csomagjait és az állandó „Általános
 * támogatás" gyűjtését.
 *
 * Új menhelynél ez a létrehozáskor automatikusan lefut. Ez a végpont a korábban
 * létrejött menhelyekhez kell: azoknál a csomagok oldala üresen állna, és a
 * menhely admin számára nem lenne belőle kiút.
 *
 * Idempotens. A saját menhelyére a menhely admin is meghívhatja – csak a
 * szabványos csomagokat és a rendszer-gyűjtést hozza létre, semmi szabadon
 * megadhatót.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const membership = await prisma.shelterAdmin.findUnique({
      where: { userId_shelterId: { userId: session.user.id, shelterId: params.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
  }

  const shelter = await prisma.shelter.findUnique({
    where:  { id: params.id },
    select: { id: true },
  });
  if (!shelter) {
    return NextResponse.json({ error: "A menhely nem található" }, { status: 404 });
  }

  const result = await ensureShelterDefaults(params.id);
  return NextResponse.json(result);
}
