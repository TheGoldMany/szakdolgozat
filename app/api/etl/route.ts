import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dwh } from "@/lib/dwh";

const HU_MONTHS = [
  "január","február","március","április","május","június",
  "július","augusztus","szeptember","október","november","december",
];

// Magyar törvényes ünnepnapok (fix, MM-DD)
const HU_FIXED_HOLIDAYS = new Set([
  "01-01","03-15","05-01","08-20","10-23","11-01","12-25","12-26",
]);

function isHungarianHoliday(d: Date): boolean {
  const mmdd = `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return HU_FIXED_HOLIDAYS.has(mmdd);
}

function toDateOnly(dt: Date): Date {
  const d = new Date(dt);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function upsertDimDate(dt: Date) {
  const d     = toDateOnly(dt);
  const month = d.getUTCMonth();
  return dwh.dimDate.upsert({
    where:  { date: d },
    update: {},
    create: {
      date:      d,
      year:      d.getUTCFullYear(),
      month:     month + 1,
      monthName: HU_MONTHS[month],
      day:       d.getUTCDate(),
      quarter:   Math.ceil((month + 1) / 3),
      dayOfWeek: d.getUTCDay(),
      isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
      isHoliday: isHungarianHoliday(d),
    },
  });
}

function computeAgeCategory(ageMonths: number | null | undefined): string {
  if (ageMonths == null) return "UNKNOWN";
  if (ageMonths < 6)    return "PUPPY";
  if (ageMonths < 24)   return "YOUNG";
  if (ageMonths < 96)   return "ADULT";
  return "SENIOR";
}

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

  // ── 1. OLTP adatok betöltése ─────────────────────────
  const [shelters, animals, users] = await Promise.all([
    prisma.shelter.findMany(),
    prisma.animal.findMany(),
    prisma.user.findMany({ select: { id: true, city: true, country: true, role: true } }),
  ]);

  // Csak COMPLETED kérelmek a FactAdoption-höz, érkezési sorrendben
  const completedApps = await prisma.adoptionApplication.findMany({
    where:   { status: ApplicationStatus.APPROVED },
    include: { animal: { select: { shelterId: true, arrivedAt: true, createdAt: true, age: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Összes kérelem az applicationCount mértékhez
  const allApps = await prisma.adoptionApplication.findMany({ select: { animalId: true } });

  // applicationCount: hány kérelem érkezett állatonként (összes státusz)
  const appCountMap = new Map<string, number>();
  for (const a of allApps) {
    appCountMap.set(a.animalId, (appCountMap.get(a.animalId) ?? 0) + 1);
  }

  // ── 2. DimShelter ────────────────────────────────────
  for (const s of shelters) {
    await dwh.dimShelter.upsert({
      where:  { shelterId: s.id },
      update: { name: s.name, city: s.city, isVerified: s.isVerified },
      create: { shelterId: s.id, name: s.name, city: s.city, country: s.country, isVerified: s.isVerified },
    });
  }
  log.push(`DimShelter: ${shelters.length} upserted`);

  // ── 3. DimAnimal ─────────────────────────────────────
  let animalCount = 0;
  for (const a of animals) {
    const ds = await dwh.dimShelter.findUnique({ where: { shelterId: a.shelterId } });
    if (!ds) continue;
    const ageCategory = computeAgeCategory(a.age);
    await dwh.dimAnimal.upsert({
      where:  { animalId: a.id },
      update: { name: a.name, type: a.type, breed: a.breed, size: a.size ?? null, gender: a.gender, ageCategory, shelterId: ds.id },
      create: { animalId: a.id, name: a.name, type: a.type, breed: a.breed, size: a.size ?? null, gender: a.gender, ageCategory, shelterId: ds.id },
    });
    animalCount++;
  }
  log.push(`DimAnimal: ${animalCount} upserted`);

  // ── 4. DimUser ───────────────────────────────────────
  for (const u of users) {
    await dwh.dimUser.upsert({
      where:  { userId: u.id },
      update: { city: u.city, role: u.role },
      create: { userId: u.id, city: u.city, country: u.country, role: u.role },
    });
  }
  log.push(`DimUser: ${users.length} upserted`);

  // ── 5. FactAdoption ──────────────────────────────────
  // Visszakerülés detektálás: ha egy állatnak már volt korábbi COMPLETED kérelme
  const completedCountByAnimal = new Map<string, number>();

  let factAdoptionCount = 0;
  for (const app of completedApps) {
    const adoptDate = app.reviewedAt ?? app.createdAt;
    const dimDate   = await upsertDimDate(adoptDate);
    const dimAnimal = await dwh.dimAnimal.findUnique({ where: { animalId: app.animalId } });
    const dimShelter= await dwh.dimShelter.findUnique({ where: { shelterId: app.animal.shelterId } });
    const dimUser   = await dwh.dimUser.findUnique({ where: { userId: app.userId } });

    if (!dimAnimal || !dimShelter || !dimUser) continue;

    // stayDurationDays: érkezéstől az örökbefogadásig
    const intakeDate       = app.animal.arrivedAt ?? app.animal.createdAt;
    const diffMs           = adoptDate.getTime() - intakeDate.getTime();
    const stayDurationDays = diffMs >= 0 ? Math.round(diffMs / 86_400_000) : null;

    // isReturn: volt-e már korábbi COMPLETED kérelem ehhez az állathoz
    const prevCompleted = completedCountByAnimal.get(app.animalId) ?? 0;
    const isReturn      = prevCompleted > 0;
    completedCountByAnimal.set(app.animalId, prevCompleted + 1);

    await dwh.factAdoption.upsert({
      where:  { applicationId: app.id },
      update: {
        status:           app.status,
        reviewedAt:       app.reviewedAt ?? null,
        stayDurationDays,
        applicationCount: appCountMap.get(app.animalId) ?? 1,
        isReturn,
      },
      create: {
        applicationId:    app.id,
        dateId:           dimDate.id,
        animalId:         dimAnimal.id,
        shelterId:        dimShelter.id,
        userId:           dimUser.id,
        status:           app.status,
        homeType:         app.homeType,
        hasGarden:        app.hasGarden,
        hasChildren:      app.hasChildren,
        hasPets:          app.hasPets,
        createdAt:        app.createdAt,
        reviewedAt:       app.reviewedAt ?? null,
        stayDurationDays,
        applicationCount: appCountMap.get(app.animalId) ?? 1,
        isReturn,
      },
    });
    factAdoptionCount++;
  }
  log.push(`FactAdoption: ${factAdoptionCount} upserted`);

  // ── 6. FactAnimalInventory – mai napi pillanatkép ────
  const dimToday = await upsertDimDate(new Date());

  const inv = new Map<string, number>();
  for (const a of animals) {
    const key = `${a.shelterId}::${a.status}`;
    inv.set(key, (inv.get(key) ?? 0) + 1);
  }

  let invCount = 0;
  for (const [key, count] of inv) {
    const [shelterId, status] = key.split("::");
    const ds = await dwh.dimShelter.findUnique({ where: { shelterId } });
    if (!ds) continue;
    await dwh.factAnimalInventory.upsert({
      where:  { dateId_shelterId_status: { dateId: dimToday.id, shelterId: ds.id, status } },
      update: { count },
      create: { dateId: dimToday.id, shelterId: ds.id, status, count },
    });
    invCount++;
  }
  log.push(`FactAnimalInventory: ${invCount} sor upserted (mai nap)`);

  const elapsedMs = Date.now() - t0;
  log.push(`Futási idő: ${elapsedMs}ms`);

  // ── 7. ETL futásnapló mentése ────────────────────────
  await dwh.etlRun.create({
    data: {
      startedAt,
      finishedAt:    new Date(),
      elapsedMs,
      adoptionCount: factAdoptionCount,
      inventoryCount: invCount,
      log:           log.join("\n"),
    },
  });

  return NextResponse.json({ success: true, log });
}
