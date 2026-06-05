import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dwh } from "@/lib/dwh";
import {
  toDateOnly, monthName, isHungarianHoliday,
  computeAgeCategory, computeStayDurationDays,
} from "@/lib/etl-helpers";

// Vercel Pro: 60s; Hobby: 10s (optimalizált batch-ekkel elegendő)
export const maxDuration = 60;

// POST /api/etl  – védett: Authorization: Bearer <ETL_SECRET>
export async function POST(req: NextRequest) {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== process.env.ETL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const startedAt = new Date();
  const t0 = Date.now();

  // ── 1. OLTP adatok egyszeri lekérése ─────────────────
  const [shelters, animals, users, completedApps, allApps, reports] = await Promise.all([
    prisma.shelter.findMany(),
    prisma.animal.findMany(),
    prisma.user.findMany({ select: { id: true, city: true, country: true, role: true } }),
    prisma.adoptionApplication.findMany({
      where:   { status: ApplicationStatus.APPROVED },
      include: { animal: { select: { shelterId: true, arrivedAt: true, createdAt: true, age: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adoptionApplication.findMany({ select: { animalId: true } }),
    prisma.animalReport.findMany({
      select: { id: true, type: true, status: true, city: true, lat: true, lng: true, createdAt: true, userId: true },
    }),
  ]);

  // applicationCount mérték: állatonként hány kérelem érkezett
  const appCountMap = new Map<string, number>();
  for (const a of allApps) {
    appCountMap.set(a.animalId, (appCountMap.get(a.animalId) ?? 0) + 1);
  }

  // ── 2. DWH tisztítás (tény → dimenzió sorrendben) ────
  await dwh.factAnimalReport.deleteMany({});
  await dwh.factAnimalInventory.deleteMany({});
  await dwh.factAdoption.deleteMany({});
  await dwh.dimAnimal.deleteMany({});
  await dwh.dimUser.deleteMany({});
  await dwh.dimShelter.deleteMany({});
  await dwh.dimDate.deleteMany({});
  log.push("DWH táblák törölve");

  // ── 3. DimShelter ─────────────────────────────────────
  await dwh.dimShelter.createMany({
    data: shelters.map(s => ({
      shelterId:  s.id,
      name:       s.name,
      city:       s.city,
      country:    s.country,
      isVerified: s.isVerified,
      capacity:   s.capacity ?? null,
    })),
    skipDuplicates: true,
  });
  const dimShelterRows = await dwh.dimShelter.findMany();
  const shelterMap = new Map(dimShelterRows.map(s => [s.shelterId, s.id]));
  log.push(`DimShelter: ${dimShelterRows.length} sor`);

  // ── 4. DimAnimal ──────────────────────────────────────
  const dimAnimalData = animals
    .filter(a => shelterMap.has(a.shelterId))
    .map(a => ({
      animalId:    a.id,
      name:        a.name,
      type:        a.type,
      breed:       a.breed,
      size:        a.size ?? null,
      gender:      a.gender,
      ageCategory: computeAgeCategory(a.age),
      shelterId:   shelterMap.get(a.shelterId)!,
    }));
  for (let i = 0; i < dimAnimalData.length; i += 500) {
    await dwh.dimAnimal.createMany({ data: dimAnimalData.slice(i, i + 500), skipDuplicates: true });
  }
  const dimAnimalRows = await dwh.dimAnimal.findMany({ select: { id: true, animalId: true } });
  const animalMap = new Map(dimAnimalRows.map(a => [a.animalId, a.id]));
  log.push(`DimAnimal: ${dimAnimalRows.length} sor`);

  // ── 5. DimUser ────────────────────────────────────────
  for (let i = 0; i < users.length; i += 500) {
    await dwh.dimUser.createMany({
      data: users.slice(i, i + 500).map(u => ({
        userId:  u.id,
        city:    u.city,
        country: u.country,
        role:    u.role,
      })),
      skipDuplicates: true,
    });
  }
  const dimUserRows = await dwh.dimUser.findMany({ select: { id: true, userId: true } });
  const userMap = new Map(dimUserRows.map(u => [u.userId, u.id]));
  log.push(`DimUser: ${dimUserRows.length} sor`);

  // ── 6. DimDate (csak a szükséges dátumok) ────────────
  const neededDates = new Set<string>();
  for (const app of completedApps) {
    neededDates.add(toDateOnly(app.reviewedAt ?? app.createdAt).toISOString());
  }
  for (const r of reports) {
    neededDates.add(toDateOnly(r.createdAt).toISOString());
  }
  neededDates.add(toDateOnly(new Date()).toISOString()); // mai nap az inventory-hoz

  const dimDateData = [...neededDates].map(iso => {
    const d     = new Date(iso);
    const month = d.getUTCMonth();
    return {
      date:      d,
      year:      d.getUTCFullYear(),
      month:     month + 1,
      monthName: monthName(month + 1),
      day:       d.getUTCDate(),
      quarter:   Math.ceil((month + 1) / 3),
      dayOfWeek: d.getUTCDay(),
      isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
      isHoliday: isHungarianHoliday(d),
    };
  });
  await dwh.dimDate.createMany({ data: dimDateData, skipDuplicates: true });
  const dimDateRows = await dwh.dimDate.findMany();
  const dateMap = new Map(dimDateRows.map(d => [d.date.toISOString(), d.id]));
  log.push(`DimDate: ${dimDateRows.length} sor`);

  // ── 7. FactAdoption (teljes batch) ───────────────────
  const completedCountByAnimal = new Map<string, number>();
  const factAdoptionData: {
    applicationId:    string;
    dateId:           number;
    animalId:         number;
    shelterId:        number;
    userId:           number;
    status:           string;
    stayDurationDays: number | null;
    applicationCount: number;
    isReturn:         boolean;
    homeType:         string | null;
    hasGarden:        boolean | null;
    hasChildren:      boolean | null;
    hasPets:          boolean | null;
    createdAt:        Date;
    reviewedAt:       Date | null;
  }[] = [];

  for (const app of completedApps) {
    const adoptDate  = app.reviewedAt ?? app.createdAt;
    const dateId     = dateMap.get(toDateOnly(adoptDate).toISOString());
    const dimAnimalId  = animalMap.get(app.animalId);
    const dimShelterId = shelterMap.get(app.animal.shelterId);
    const dimUserId    = userMap.get(app.userId);
    if (!dateId || !dimAnimalId || !dimShelterId || !dimUserId) continue;

    const intakeDate       = app.animal.arrivedAt ?? app.animal.createdAt;
    const stayDurationDays = computeStayDurationDays(intakeDate, adoptDate);

    const prevCompleted = completedCountByAnimal.get(app.animalId) ?? 0;
    completedCountByAnimal.set(app.animalId, prevCompleted + 1);

    factAdoptionData.push({
      applicationId:    app.id,
      dateId,
      animalId:         dimAnimalId,
      shelterId:        dimShelterId,
      userId:           dimUserId,
      status:           app.status,
      stayDurationDays,
      applicationCount: appCountMap.get(app.animalId) ?? 1,
      isReturn:         prevCompleted > 0,
      homeType:         app.homeType,
      hasGarden:        app.hasGarden,
      hasChildren:      app.hasChildren,
      hasPets:          app.hasPets,
      createdAt:        app.createdAt,
      reviewedAt:       app.reviewedAt ?? null,
    });
  }

  for (let i = 0; i < factAdoptionData.length; i += 500) {
    await dwh.factAdoption.createMany({ data: factAdoptionData.slice(i, i + 500), skipDuplicates: true });
  }
  log.push(`FactAdoption: ${factAdoptionData.length} sor`);

  // ── 8. FactAnimalInventory – mai pillanatkép ──────────
  const capacityMap = new Map(shelters.map(s => [s.id, s.capacity ?? null]));
  const todayId = dateMap.get(toDateOnly(new Date()).toISOString());
  let inventoryCount = 0;
  if (todayId) {
    // count per shelter × status
    const inv = new Map<string, number>();
    for (const a of animals) {
      const dsId = shelterMap.get(a.shelterId);
      if (!dsId) continue;
      const key = `${dsId}::${a.status}`;
      inv.set(key, (inv.get(key) ?? 0) + 1);
    }
    // occupied = AVAILABLE + PENDING per shelter
    const occupiedMap = new Map<number, number>();
    for (const a of animals) {
      const dsId = shelterMap.get(a.shelterId);
      if (!dsId) continue;
      if (a.status === "AVAILABLE" || a.status === "PENDING") {
        occupiedMap.set(dsId, (occupiedMap.get(dsId) ?? 0) + 1);
      }
    }
    const invData = [...inv.entries()].map(([key, count]) => {
      const [shelterId, status] = key.split("::");
      const dsId     = Number(shelterId);
      const oltpId   = dimShelterRows.find(r => r.id === dsId)?.shelterId;
      const cap      = oltpId ? (capacityMap.get(oltpId) ?? null) : null;
      const occupied = occupiedMap.get(dsId) ?? 0;
      const utilizationRate = cap && cap > 0 ? occupied / cap : null;
      return { dateId: todayId, shelterId: dsId, status, count, utilizationRate };
    });
    await dwh.factAnimalInventory.createMany({ data: invData, skipDuplicates: true });
    inventoryCount = invData.length;
    log.push(`FactAnimalInventory: ${invData.length} sor`);
  }

  // ── 9. FactAnimalReport ───────────────────────────────
  type ReportRow = {
    reportId:  string;
    dateId:    number;
    shelterId: number | null;
    type:      string;
    city:      string | null;
    lat:       number | null;
    lng:       number | null;
    status:    string;
    isMatched: boolean;
    createdAt: Date;
  };
  const reportData: ReportRow[] = reports
    .flatMap(r => {
      const dateId = dateMap.get(toDateOnly(r.createdAt).toISOString());
      if (!dateId) return [];
      return [{
        reportId:  r.id,
        dateId,
        shelterId: null,
        type:      r.type,
        city:      r.city ?? null,
        lat:       r.lat ?? null,
        lng:       r.lng ?? null,
        status:    r.status,
        isMatched: r.status === "RESOLVED",
        createdAt: r.createdAt,
      }];
    });

  for (let i = 0; i < reportData.length; i += 500) {
    await dwh.factAnimalReport.createMany({ data: reportData.slice(i, i + 500), skipDuplicates: true });
  }
  log.push(`FactAnimalReport: ${reportData.length} sor`);

  const elapsedMs = Date.now() - t0;
  log.push(`Futási idő: ${elapsedMs}ms`);

  // ── 10. ETL futásnapló ────────────────────────────────
  await dwh.etlRun.create({
    data: {
      startedAt,
      finishedAt:    new Date(),
      elapsedMs,
      adoptionCount: factAdoptionData.length,
      inventoryCount,
      log:           log.join("\n"),
    },
  });

  return NextResponse.json({ success: true, log });
}
