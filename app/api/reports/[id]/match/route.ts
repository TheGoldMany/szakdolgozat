import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMatchingForReport } from "@/lib/report-matching";
import { notifyNearbyShelters } from "@/lib/notifications";

// A párosítás eltarthat néhány másodpercig (Claude Vision hívások).
export const maxDuration = 60;

/**
 * Lefuttatja a kép-alapú párosítást egy bejelentésre, és értesíti a közeli
 * menhelyeket, ha kóbor állatról van szó.
 * A bejelentés-űrlap hívja meg a sikeres létrehozás után.
 * Bejelentés lehet anonim, ezért auth nélkül is hívható – csak a megadott
 * id-re fut, idempotens, és semmilyen adatot nem szivárogtat ki.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const report = await prisma.animalReport.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!report) {
    return NextResponse.json({ error: "Bejelentés nem található" }, { status: 404 });
  }

  // Mindkettő hibatűrő; a párosítás és a közeli-menhely értesítés egymástól függetlenül fut.
  await Promise.allSettled([
    runMatchingForReport(params.id),
    notifyNearbyShelters(params.id),
  ]);
  return NextResponse.json({ ok: true });
}
