import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/analytics?shelterIds=id1,id2
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  // ── Shelter filter ─────────────────────────────────────
  let shelterIds: string[];
  if (role === "SUPER_ADMIN") {
    const param = req.nextUrl.searchParams.get("shelterIds");
    if (param && param.trim()) {
      shelterIds = param.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      const all = await prisma.shelter.findMany({ select: { id: true } });
      shelterIds = all.map((s) => s.id);
    }
  } else {
    const admin = await prisma.shelterAdmin.findFirst({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    if (!admin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    shelterIds = [admin.shelterId];
  }

  const now   = new Date();
  const y     = now.getFullYear();
  const start24m = new Date(now);
  start24m.setMonth(start24m.getMonth() - 23);
  start24m.setDate(1);
  start24m.setHours(0, 0, 0, 0);

  // ── Fetch raw data ─────────────────────────────────────
  const [approvedApps, allAnimals, shelterData, reports] = await Promise.all([
    prisma.adoptionApplication.findMany({
      where: {
        status:     "APPROVED",
        reviewedAt: { gte: start24m },
        animal:     { shelterId: { in: shelterIds } },
      },
      select: {
        id:          true,
        reviewedAt:  true,
        homeType:    true,
        hasGarden:   true,
        hasChildren: true,
        hasPets:     true,
        animal:      { select: { type: true, arrivedAt: true, createdAt: true, id: true } },
      },
    }),
    prisma.animal.findMany({
      where:  { shelterId: { in: shelterIds } },
      select: { id: true, status: true, shelterId: true },
    }),
    prisma.shelter.findMany({
      where:  { id: { in: shelterIds } },
      select: { id: true, name: true, capacity: true },
    }),
    prisma.animalReport.findMany({
      select: { id: true, type: true, status: true, city: true, createdAt: true },
    }),
  ]);

  // ────────────────────────────────────────────────────────
  // UC-01: Havi összefoglaló
  // ────────────────────────────────────────────────────────

  const totalAdoptions = approvedApps.length;

  // YoY: current year vs last year (adoptions in 12m window)
  const thisYearStart = new Date(y, 0, 1);
  const lastYearStart = new Date(y - 1, 0, 1);
  const lastYearEnd   = new Date(y, 0, 1);

  const thisYearApps = await prisma.adoptionApplication.count({
    where: { status: "APPROVED", reviewedAt: { gte: thisYearStart }, animal: { shelterId: { in: shelterIds } } },
  });
  const lastYearApps = await prisma.adoptionApplication.count({
    where: { status: "APPROVED", reviewedAt: { gte: lastYearStart, lt: lastYearEnd }, animal: { shelterId: { in: shelterIds } } },
  });
  const yoyGrowth = lastYearApps > 0
    ? Math.round(((thisYearApps - lastYearApps) / lastYearApps) * 1000) / 10
    : null;

  // 24-month trend by species
  const ANIMAL_TYPES = ["DOG", "CAT", "RABBIT", "BIRD", "OTHER"] as const;
  const monthlyMap = new Map<string, Record<string, number>>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, { DOG: 0, CAT: 0, RABBIT: 0, BIRD: 0, OTHER: 0 });
  }
  for (const app of approvedApps) {
    const d   = app.reviewedAt ?? new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = monthlyMap.get(key);
    if (!row) continue;
    const t = ANIMAL_TYPES.includes(app.animal.type as typeof ANIMAL_TYPES[number])
      ? app.animal.type
      : "OTHER";
    row[t] = (row[t] ?? 0) + 1;
  }
  const monthlyTrend = [...monthlyMap.entries()].map(([key, counts]) => ({
    month: key,
    label: new Date(key + "-01").toLocaleDateString("hu-HU", { year: "numeric", month: "short" }),
    ...counts,
  }));

  // Species donut
  const speciesCount: Record<string, number> = { DOG: 0, CAT: 0, RABBIT: 0, BIRD: 0, OTHER: 0 };
  for (const app of approvedApps) {
    const t = ANIMAL_TYPES.includes(app.animal.type as typeof ANIMAL_TYPES[number]) ? app.animal.type : "OTHER";
    speciesCount[t] = (speciesCount[t] ?? 0) + 1;
  }
  const SPECIES_LABELS: Record<string, string> = { DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb" };
  const bySpecies = Object.entries(speciesCount)
    .filter(([, c]) => c > 0)
    .map(([type, count]) => ({ type, label: SPECIES_LABELS[type] ?? type, count }));

  // ────────────────────────────────────────────────────────
  // UC-02: Kapacitás és tartózkodási idők
  // ────────────────────────────────────────────────────────

  // Average stay by species
  const stayBucket: Record<string, { total: number; count: number }> = {};
  for (const app of approvedApps) {
    if (!app.reviewedAt) continue;
    const intake   = app.animal.arrivedAt ?? app.animal.createdAt;
    const stayDays = Math.round((app.reviewedAt.getTime() - intake.getTime()) / 86_400_000);
    if (stayDays < 0 || stayDays > 3650) continue;
    const t = ANIMAL_TYPES.includes(app.animal.type as typeof ANIMAL_TYPES[number]) ? app.animal.type : "OTHER";
    if (!stayBucket[t]) stayBucket[t] = { total: 0, count: 0 };
    stayBucket[t].total += stayDays;
    stayBucket[t].count += 1;
  }
  const avgStayBySpecies = Object.entries(stayBucket).map(([type, { total, count }]) => ({
    type,
    label:   SPECIES_LABELS[type] ?? type,
    avgDays: count > 0 ? Math.round(total / count) : 0,
  }));

  // Stay duration categories
  const cats = { week: 0, month: 0, quarter: 0, longer: 0 };
  for (const app of approvedApps) {
    if (!app.reviewedAt) continue;
    const intake   = app.animal.arrivedAt ?? app.animal.createdAt;
    const stayDays = Math.round((app.reviewedAt.getTime() - intake.getTime()) / 86_400_000);
    if (stayDays < 0) continue;
    if (stayDays < 7)        cats.week++;
    else if (stayDays < 30)  cats.month++;
    else if (stayDays < 90)  cats.quarter++;
    else                     cats.longer++;
  }
  const stayCategories = [
    { label: "< 1 hét",    days: "0-6",    count: cats.week },
    { label: "1-4 hét",    days: "7-29",   count: cats.month },
    { label: "1-3 hónap",  days: "30-89",  count: cats.quarter },
    { label: "3+ hónap",   days: "90+",    count: cats.longer },
  ];

  // Utilization rate per shelter (active: AVAILABLE + PENDING / capacity)
  const shelterUtil = shelterData.map((s) => {
    const occupied = allAnimals.filter(
      (a) => a.shelterId === s.id && (a.status === "AVAILABLE" || a.status === "PENDING")
    ).length;
    const utilizationRate = s.capacity && s.capacity > 0 ? occupied / s.capacity : null;
    return { shelterId: s.id, name: s.name, occupied, capacity: s.capacity, utilizationRate };
  });
  const avgUtilization = (() => {
    const rated = shelterUtil.filter((s) => s.utilizationRate !== null);
    if (!rated.length) return null;
    return Math.round(rated.reduce((s, r) => s + (r.utilizationRate ?? 0), 0) / rated.length * 100) / 100;
  })();

  // ────────────────────────────────────────────────────────
  // UC-03: Területi bejelentési adatok (platform-wide)
  // ────────────────────────────────────────────────────────

  const lostCount  = reports.filter((r) => r.type === "LOST").length;
  const foundCount = reports.filter((r) => r.type === "FOUND").length;
  const strayCount = reports.filter((r) => r.type === "STRAY").length;
  const resolvedLost = reports.filter((r) => r.type === "LOST" && r.status === "RESOLVED").length;
  const matchRate    = lostCount > 0 ? Math.round((resolvedLost / lostCount) * 1000) / 10 : 0;
  const lostMinusFound = lostCount - foundCount;

  const cityMap = new Map<string, { lost: number; found: number; stray: number }>();
  for (const r of reports) {
    const city = r.city ?? "Ismeretlen";
    if (!cityMap.has(city)) cityMap.set(city, { lost: 0, found: 0, stray: 0 });
    const row = cityMap.get(city)!;
    if (r.type === "LOST")  row.lost++;
    if (r.type === "FOUND") row.found++;
    if (r.type === "STRAY") row.stray++;
  }
  const reportsByCity = [...cityMap.entries()]
    .map(([city, counts]) => ({ city, ...counts, total: counts.lost + counts.found + counts.stray }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const byReportType = [
    { type: "LOST",  label: "Elveszett", count: lostCount },
    { type: "FOUND", label: "Megtalált", count: foundCount },
    { type: "STRAY", label: "Kóbor",     count: strayCount },
  ].filter((r) => r.count > 0);

  // ────────────────────────────────────────────────────────
  // UC-04: Visszatérési arány és profil
  // ────────────────────────────────────────────────────────

  // All-time approved for return rate (not just 24m)
  const allApproved = await prisma.adoptionApplication.findMany({
    where:  { status: "APPROVED", animal: { shelterId: { in: shelterIds } } },
    select: { animalId: true, reviewedAt: true, homeType: true, hasGarden: true, hasChildren: true, hasPets: true },
  });

  const animalAdoptionCount = new Map<string, number>();
  for (const app of allApproved) {
    animalAdoptionCount.set(app.animalId, (animalAdoptionCount.get(app.animalId) ?? 0) + 1);
  }
  const uniqueAnimals = animalAdoptionCount.size;
  const returnAnimals = [...animalAdoptionCount.values()].filter((c) => c > 1).length;
  const returnRate    = uniqueAnimals > 0 ? Math.round((returnAnimals / uniqueAnimals) * 1000) / 10 : 0;

  // YoY return rate
  const thisYearAllApps = allApproved.filter(
    (a) => a.reviewedAt && a.reviewedAt >= thisYearStart
  );
  const lastYearAllApps = allApproved.filter(
    (a) => a.reviewedAt && a.reviewedAt >= lastYearStart && a.reviewedAt < lastYearEnd
  );
  const calcReturnRate = (apps: typeof allApproved) => {
    const m = new Map<string, number>();
    for (const a of apps) m.set(a.animalId, (m.get(a.animalId) ?? 0) + 1);
    const u = m.size;
    const r = [...m.values()].filter((c) => c > 1).length;
    return u > 0 ? (r / u) * 100 : 0;
  };
  const thisRR = calcReturnRate(thisYearAllApps);
  const lastRR = calcReturnRate(lastYearAllApps);
  const yoyReturnRateChange = lastYearAllApps.length > 0
    ? Math.round((thisRR - lastRR) * 10) / 10
    : null;

  // Adopter profile
  const profileBase  = allApproved.length;
  const adoptionsByHomeType = [
    { homeType: "HOUSE",     label: "Ház",       count: allApproved.filter((a) => a.homeType === "HOUSE").length },
    { homeType: "APARTMENT", label: "Lakás",     count: allApproved.filter((a) => a.homeType === "APARTMENT").length },
    { homeType: "OTHER",     label: "Egyéb",     count: allApproved.filter((a) => a.homeType === "OTHER").length },
  ].filter((r) => r.count > 0);

  const adoptionsByProfile = {
    withGarden:   profileBase > 0 ? Math.round(allApproved.filter((a) => a.hasGarden).length / profileBase * 100) : 0,
    withChildren: profileBase > 0 ? Math.round(allApproved.filter((a) => a.hasChildren).length / profileBase * 100) : 0,
    withPets:     profileBase > 0 ? Math.round(allApproved.filter((a) => a.hasPets).length / profileBase * 100) : 0,
  };

  return NextResponse.json({
    uc01: { totalAdoptions, yoyGrowth, thisYearApps, lastYearApps, monthlyTrend, bySpecies },
    uc02: { avgStayBySpecies, stayCategories, shelterUtil, avgUtilization },
    uc03: { lostCount, foundCount, strayCount, matchRate, lostMinusFound, byReportType, reportsByCity },
    uc04: { returnRate, yoyReturnRateChange, returnAnimals, uniqueAnimals, adoptionsByHomeType, adoptionsByProfile },
  });
}
