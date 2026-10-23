import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReportStatus, ReportType } from "@prisma/client";
import { backfillReportCoords } from "@/lib/report-location";

// GET /api/map  – jelentések + menhelyek + állatorvosi rendelők koordinátákkal
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  // A paraméterek eddig `as never`-rel, ellenőrzés nélkül kerültek a
  // lekérdezésbe: egy ismeretlen érték 500-at adott. Csak létező enum-érték.
  const rawType   = searchParams.get("type");
  const rawStatus = searchParams.get("status") ?? "ACTIVE";
  const type   = (Object.values(ReportType) as string[]).includes(rawType ?? "")
    ? (rawType as ReportType) : null;
  const status = rawStatus === "ALL" ? "ALL"
    : (Object.values(ReportStatus) as string[]).includes(rawStatus) ? (rawStatus as ReportStatus)
    : ReportStatus.ACTIVE;

  // A korábban koordináta nélkül mentett bejelentések pótlása, a válasz
  // elküldése UTÁN: ez a lekérés még nem várja meg, a következő már látja.
  after(() => backfillReportCoords().catch((err) => console.error("[api/map backfill]", err)));

  try {
    const [reports, shelters, vets] = await Promise.all([
      prisma.animalReport.findMany({
        where: {
          lat:    { not: null },
          lng:    { not: null },
          ...(status !== "ALL" && { status }),
          ...(type   && { type }),
        },
        select: {
          id:          true,
          type:        true,
          animalType:  true,
          name:        true,
          breed:       true,
          city:        true,
          description: true,
          imageUrl:    true,
          lat:         true,
          lng:         true,
          status:      true,
          createdAt:   true,
          contactPhone: true,
          contactName:  true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.shelter.findMany({
        where: { isActive: true, lat: { not: null }, lng: { not: null } },
        select: {
          id:         true,
          name:       true,
          city:       true,
          address:    true,
          phone:      true,
          email:      true,
          isVerified: true,
          logoUrl:    true,
          lat:        true,
          lng:        true,
          slug:       true,
          _count:     { select: { animals: { where: { status: "AVAILABLE" } } } },
        },
      }),
      prisma.vetClinic.findMany({
        where: { isActive: true, lat: { not: null }, lng: { not: null } },
        select: {
          id:           true,
          name:         true,
          city:         true,
          address:      true,
          phone:        true,
          website:      true,
          openingHours: true,
          isEmergency:  true,
          lat:          true,
          lng:          true,
        },
      }),
    ]);

    // A bejelentő neve és telefonszáma azért nyilvános, hogy aki megtalálta az
    // állatot, fel tudja hívni. LEZÁRT ügynél erre már nincs ok: a `?status=ALL`
    // paraméterrel eddig az összes valaha leadott bejelentés telefonszáma
    // egyben lekérhető volt — egy évekig gyűjthető névsor.
    const safeReports = reports.map((r) =>
      r.status === ReportStatus.ACTIVE ? r : { ...r, contactPhone: null, contactName: null }
    );

    return NextResponse.json({ reports: safeReports, shelters, vets });
  } catch (error) {
    console.error('[api/map GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
