import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureShelterDefaults } from "@/lib/shelter-defaults";

/**
 * POST /api/admin/shelter-defaults
 *
 * Visszatöltés: minden meglévő menhelynek létrehozza a hiányzó fix csomagokat
 * és az állandó „Általános támogatás" gyűjtést, a nem szabványos összegű régi
 * csomagokat pedig inaktívra állítja.
 *
 * Idempotens, tetszőlegesen sokszor futtatható. Csak SUPER_ADMIN hívhatja.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const shelters = await prisma.shelter.findMany({ select: { id: true, name: true } });

  const summary = { shelters: shelters.length, tiersCreated: 0, legacyDeactivated: 0, campaignsCreated: 0 };
  const failed: string[] = [];

  // Sorosan fut: egy menhely hibája ne bontsa el a többit.
  for (const shelter of shelters) {
    try {
      const r = await ensureShelterDefaults(shelter.id);
      summary.tiersCreated      += r.tiersCreated;
      summary.legacyDeactivated += r.legacyDeactivated;
      summary.campaignsCreated  += r.campaignCreated ? 1 : 0;
    } catch (err) {
      console.error(`[shelter-defaults] ${shelter.name}:`, err);
      failed.push(shelter.name);
    }
  }

  return NextResponse.json({ ...summary, failed });
}
