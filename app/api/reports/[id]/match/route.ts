import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMatchingForReport } from "@/lib/report-matching";
import { notifyNearbyShelters } from "@/lib/notifications";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Csak a frissen létrehozott bejelentésre fut.
 *
 * A végpont hitelesítés nélküli (a bejelentés lehet anonim), a bejelentések
 * azonosítója pedig nyilvános (`/reports/[id]`). A korábbi „idempotens"
 * állítás csak a saját kép elemzésére volt igaz: a jelöltekkel való
 * összevetés (Claude Vision hívások) és a közeli menhelyek értesítése MINDEN
 * hívásnál újrafutott. Bárki egy ciklussal értesítés-áradatot zúdíthatott
 * volna a menhelyekre, és korlátlan API-költséget generálhatott.
 *
 * Az űrlap a létrehozás után azonnal hívja, tehát egy régebbi bejelentésre
 * nincs jogos oka. Az időablak a fő védelem; a korlát a maradékot fogja meg.
 */
const MATCH_WINDOW_MS = 15 * 60 * 1000;

// A párosítás eltarthat néhány másodpercig (Claude Vision hívások).
export const maxDuration = 60;

/**
 * Lefuttatja a kép-alapú párosítást egy bejelentésre, és értesíti a közeli
 * menhelyeket, ha kóbor állatról van szó.
 * A bejelentés-űrlap hívja meg a sikeres létrehozás után.
 * Bejelentés lehet anonim, ezért auth nélkül is hívható – a visszaélést a
 * fenti időablak és a korlát zárja ki; adatot nem ad vissza.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!checkRateLimit(`report-match-ip:${getClientIp(req)}`, 10, MATCH_WINDOW_MS)) {
    return NextResponse.json({ error: "Túl sok kérés" }, { status: 429 });
  }

  const report = await prisma.animalReport.findUnique({
    where: { id: params.id },
    select: { id: true, createdAt: true },
  });
  if (!report) {
    return NextResponse.json({ error: "Bejelentés nem található" }, { status: 404 });
  }

  // Régi bejelentés, vagy ugyanerre már futott: csendben kihagyjuk. 200, mert
  // az űrlapnak ez nem hiba, csak nincs teendő.
  const fresh = Date.now() - report.createdAt.getTime() < MATCH_WINDOW_MS;
  if (!fresh || !checkRateLimit(`report-match:${report.id}`, 1, MATCH_WINDOW_MS)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Mindkettő hibatűrő; a párosítás és a közeli-menhely értesítés egymástól függetlenül fut.
  await Promise.allSettled([
    runMatchingForReport(params.id),
    notifyNearbyShelters(params.id),
  ]);
  return NextResponse.json({ ok: true });
}
