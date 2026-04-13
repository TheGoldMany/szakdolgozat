import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dwh } from "@/lib/dwh";

// -------------------------------------------------------
// Helper – DimDate upsert
// -------------------------------------------------------
function toDateOnly(dt: Date): Date {
  const d = new Date(dt);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function upsertDimDate(dt: Date) {
  const d = toDateOnly(dt);
  return dwh.dimDate.upsert({
    where: { date: d },
    update: {},
    create: {
      date:      d,
      year:      d.getUTCFullYear(),
      month:     d.getUTCMonth() + 1,
      day:       d.getUTCDate(),
      quarter:   Math.ceil((d.getUTCMonth() + 1) / 3),
      dayOfWeek: d.getUTCDay(),
      isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
    },
  });
}

// -------------------------------------------------------
// POST /api/etl  – védett: x-etl-token header szükséges
// -------------------------------------------------------
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-etl-token");
  if (!token || token !== process.env.ETL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const startedAt = Date.now();

  // ── 1. OLTP adatok betöltése ─────────────────────────
  const [shelters, animals, users, applications] = await Promise.all([
    prisma.shelter.findMany(),
    prisma.animal.findMany(),
    prisma.user.findMany({ select: { id: true, city: true, country: true } }),
    prisma.adoptionApplication.findMany({
      include: { animal: { select: { shelterId: true } } },
    }),
  ]);

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
    await dwh.dimAnimal.upsert({
      where:  { animalId: a.id },
      update: { name: a.name, type: a.type, breed: a.breed, size: a.size ?? null, gender: a.gender, shelterId: ds.id },
      create: { animalId: a.id, name: a.name, type: a.type, breed: a.breed, size: a.size ?? null, gender: a.gender, shelterId: ds.id },
    });
    animalCount++;
  }
  log.push(`DimAnimal: ${animalCount} upserted`);

  // ── 4. DimUser ───────────────────────────────────────
  for (const u of users) {
    await dwh.dimUser.upsert({
      where:  { userId: u.id },
      update: { city: u.city },
      create: { userId: u.id, city: u.city, country: u.country },
    });
  }
  log.push(`DimUser: ${users.length} upserted`);

  // ── 5. FactAdoption ──────────────────────────────────
  let factAdoptionCount = 0;
  for (const app of applications) {
    const dimDate    = await upsertDimDate(app.createdAt);
    const dimAnimal  = await dwh.dimAnimal.findUnique({ where: { animalId: app.animalId } });
    const dimShelter = await dwh.dimShelter.findUnique({ where: { shelterId: app.animal.shelterId } });
    const dimUser    = await dwh.dimUser.findUnique({ where: { userId: app.userId } });

    if (!dimAnimal || !dimShelter || !dimUser) continue;

    await dwh.factAdoption.upsert({
      where:  { applicationId: app.id },
      update: { status: app.status, reviewedAt: app.reviewedAt ?? null },
      create: {
        applicationId: app.id,
        dateId:        dimDate.id,
        animalId:      dimAnimal.id,
        shelterId:     dimShelter.id,
        userId:        dimUser.id,
        status:        app.status,
        homeType:      app.homeType,
        hasGarden:     app.hasGarden,
        hasChildren:   app.hasChildren,
        hasPets:       app.hasPets,
        createdAt:     app.createdAt,
        reviewedAt:    app.reviewedAt ?? null,
      },
    });
    factAdoptionCount++;
  }
  log.push(`FactAdoption: ${factAdoptionCount} upserted`);

  // ── 6. FactAnimalInventory – mai napi pillanatkép ────
  const dimToday = await upsertDimDate(new Date());

  // Csoportosítás: shelterId → status → darab
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

  const elapsed = Date.now() - startedAt;
  log.push(`Futási idő: ${elapsed}ms`);

  return NextResponse.json({ success: true, log });
}
