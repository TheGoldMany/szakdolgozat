/**
 * Elemzési bemutató-adatok a preview operatív adatbázisába (a szakdolgozat
 * Power BI riportjához). Csak Vercel Preview buildben fut, a seed-preview.ts
 * után.
 *
 * Mit tölt fel:
 *   - 400 bemutató-örökbefogadót (elemzes-NNN@example.com);
 *   - kb. 1700 állatot 3 évre visszamenőleg, nyári csúccsal az érkezésben és
 *     az örökbefogadásban;
 *   - legalább 1500 APPROVED kérelmet (reviewedAt dátummal), ebből kb. 6%
 *     visszahozás utáni második örökbefogadás (az ETL ebből számolja az
 *     isReturn mezőt), valamint elutasított, visszavont és függő kérelmeket;
 *   - 420 elveszett/talált/kóbor bejelentést valós városkoordináták köré
 *     szórva, kb. 35%-uk RESOLVED;
 *   - kapacitást minden bemutató-menhelynek úgy, hogy a foglaltság 40–110%
 *     között szóródjon (néhány menhely túlzsúfolt).
 *
 * BIZTONSÁG – ugyanazok a feltételek, mint a seed-preview.ts-ben:
 *   1. `VERCEL_ENV === "preview"` (helyben csak SEED_PREVIEW_LOCAL=1 és
 *      localhost adatbázis mellett).
 *   2. Az adatbázisban már van bemutató-adat (legalább 20 @example.com
 *      felhasználó vagy 5 bemutató-menhely). Éles adatbázisban ilyen nincs.
 *   3. Írás előtt kiírja a cél host nevét (jelszó nélkül), és csak akkor ír,
 *      ha a SEED_ANALYTICS_CONFIRM_HOST pontosan ez a host (különben száraz
 *      futás). Helyben a SEED_PREVIEW_LOCAL kapcsoló elég.
 *   4. Semmit nem töröl. Csak a saját, „elz-” azonosítójú sorokat hozza létre,
 *      és csak a bemutató-menhelyek kapacitását állítja be. Valódi
 *      feltöltésekhez (Vercel Blob) nem nyúl: a képek a bemutató-képkészletből
 *      jönnek.
 *
 * Újrafuttatható: minden sor rögzített azonosítót kap, a beszúrás
 * skipDuplicates-szel megy, és a véletlenszám-generátor rögzített magról
 * indul, ezért egy újabb futás ugyanazokat a sorokat állítaná elő, és
 * nem duplikál. A dátumok egy rögzített napig (ANCHOR) tartanak, így a
 * futás napjától sem függnek.
 */

import { PrismaClient, AnimalType, AnimalStatus, ApplicationStatus, ReportType, ReportStatus } from "@prisma/client";
import { DEMO_IMAGE_POOL, pickFrom } from "../lib/demo-images";
import { DEMO_SHELTER_NAMES } from "./demo-shelters";

const LOCAL = process.env.SEED_PREVIEW_LOCAL === "1";
const prisma = new PrismaClient();

// ── Beállítások ─────────────────────────────────────────────────────────────
const ANCHOR = new Date(Date.UTC(2026, 10, 24)); // az adatok utolsó napja
const DAY = 86_400_000;
const WINDOW_START = new Date(ANCHOR.getTime() - 3 * 365 * DAY);
const TARGET_APPROVED = 1520;   // legalább ennyi APPROVED kérelem
const USER_COUNT = 400;
const REPORT_COUNT = 420;
const RETURN_RATE = 0.065;
const P = "elz";                 // az összes saját sor azonosító-előtagja

// ── Determinisztikus véletlen ───────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261124);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const between = (a: number, b: number) => a + rnd() * (b - a);
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
function weighted<T>(items: readonly [T, number][]): T {
  const sum = items.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * sum;
  for (const [v, w] of items) { if ((r -= w) <= 0) return v; }
  return items[items.length - 1][0];
}
/** Lognormális eloszlás a megadott mediánnal (napokban). */
function logNormal(median: number, sigma = 0.75) {
  const u = Math.max(rnd(), 1e-9), v = rnd();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return median * Math.exp(sigma * z);
}
/** Havi súly: nyáron több érkezés és örökbefogadás. */
const SEASON = [0.75, 0.7, 0.85, 0.95, 1.15, 1.5, 1.7, 1.6, 1.2, 0.95, 0.8, 0.85];
const seasonal = (d: Date) => SEASON[d.getUTCMonth()] / 1.7;
/** Dátum a [from, to] tartományból, a nyári hónapokat előnyben részesítve. */
function seasonalDate(from: Date, to: Date): Date {
  for (;;) {
    const d = new Date(between(from.getTime(), to.getTime()));
    if (rnd() < seasonal(d)) return d;
  }
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

// ── Törzsadatok ─────────────────────────────────────────────────────────────
const CITIES: readonly [string, number, number, number][] = [
  // város, szélesség, hosszúság, szórás fokban (a város mérete szerint)
  ["Budapest", 47.4979, 19.0402, 0.07], ["Debrecen", 47.5316, 21.6273, 0.035],
  ["Szeged", 46.253, 20.1414, 0.035], ["Miskolc", 48.1035, 20.7784, 0.035],
  ["Pécs", 46.0727, 18.2323, 0.03], ["Győr", 47.6875, 17.6504, 0.03],
  ["Nyíregyháza", 47.9554, 21.7167, 0.03], ["Kecskemét", 46.8964, 19.6897, 0.03],
  ["Székesfehérvár", 47.186, 18.4221, 0.03], ["Szombathely", 47.2307, 16.6218, 0.025],
  ["Szolnok", 47.1621, 20.1825, 0.025], ["Érd", 47.3919, 18.9046, 0.02],
  ["Tatabánya", 47.5692, 18.4048, 0.02], ["Kaposvár", 46.3594, 17.7968, 0.02],
  ["Békéscsaba", 46.6736, 21.0877, 0.02], ["Veszprém", 47.093, 17.9093, 0.02],
  ["Zalaegerszeg", 46.8417, 16.8416, 0.02], ["Sopron", 47.6817, 16.5845, 0.02],
  ["Eger", 47.9025, 20.3772, 0.02], ["Nagykanizsa", 46.459, 16.9897, 0.018],
  ["Dunaújváros", 46.9619, 18.9355, 0.018], ["Hódmezővásárhely", 46.4181, 20.33, 0.018],
  ["Salgótarján", 48.0935, 19.7999, 0.015], ["Vác", 47.7753, 19.136, 0.015],
  ["Gödöllő", 47.5969, 19.3552, 0.015], ["Szentendre", 47.6694, 19.0756, 0.012],
  ["Cegléd", 47.173, 19.7996, 0.015], ["Baja", 46.1803, 18.9536, 0.015],
  ["Esztergom", 47.7928, 18.7408, 0.012], ["Siófok", 46.9041, 18.058, 0.015],
];
const CITY_WEIGHTS = CITIES.map((c, i) => [c, i === 0 ? 8 : i < 10 ? 2.2 : 1] as [typeof c, number]);

const NAMES = {
  DOG: ["Bodri", "Morzsa", "Bundi", "Csoki", "Pajti", "Rex", "Füles", "Buksi", "Maci", "Lord", "Zsömle", "Tappancs", "Pötyi", "Bogáncs", "Vackor", "Szotyi", "Bella", "Luna", "Max", "Rocky", "Mázli", "Zorro", "Cézár", "Hópihe", "Pamacs"],
  CAT: ["Cirmi", "Mirci", "Pamacs", "Szöszi", "Garfield", "Mici", "Bajusz", "Csillag", "Picur", "Kormi", "Narancs", "Bolyhos", "Felix", "Tigris", "Hamu", "Dorka", "Mimi", "Zokni"],
  RABBIT: ["Répa", "Nyuszkó", "Tapsi", "Gombóc", "Pihe", "Vattacukor"],
  BIRD: ["Csőrike", "Pityu", "Kék", "Zöldike"],
  OTHER: ["Sün Samu", "Hörcsi", "Tüske", "Mókus"],
} satisfies Record<AnimalType, string[]>;
const BREEDS = {
  DOG: ["Keverék", "Keverék", "Keverék", "Labrador keverék", "Németjuhász keverék", "Tacskó keverék", "Puli", "Vizsla keverék", "Beagle keverék", "Staffordshire keverék"],
  CAT: ["Házi macska", "Házi macska", "Házi macska", "Perzsa keverék", "Brit rövidszőrű keverék", "Sziámi keverék"],
  RABBIT: ["Törpenyúl", "Kosorrú nyúl"],
  BIRD: ["Hullámos papagáj", "Nimfapapagáj"],
  OTHER: ["Sün", "Hörcsög", "Tengerimalac"],
} satisfies Record<AnimalType, string[]>;
const STAY_MEDIAN: Record<AnimalType, number> = { DOG: 48, CAT: 36, RABBIT: 62, BIRD: 55, OTHER: 58 };
const SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function household() {
  const homeType = weighted([["HOUSE", 46], ["APARTMENT", 44], ["OTHER", 10]] as const);
  return {
    homeType,
    hasGarden: homeType === "HOUSE" ? rnd() < 0.82 : homeType === "OTHER" ? rnd() < 0.4 : rnd() < 0.08,
    hasChildren: rnd() < 0.36,
    hasPets: rnd() < 0.42,
  };
}

// ── Védelem ─────────────────────────────────────────────────────────────────
function guardEnvironment(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  if (!/^postgres(ql)?:\/\//.test(url)) return "nincs érvényes DATABASE_URL";
  if (process.env.VERCEL_ENV === "preview") return null;
  if (LOCAL && /@(localhost|127\.0\.0\.1)[:/]/.test(url)) return null;
  return `VERCEL_ENV=${process.env.VERCEL_ENV ?? "(üres)"}, nem preview`;
}
/** A cél host neve jelszó és felhasználónév nélkül, a naplóhoz. */
function targetHost(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return `${u.hostname}${u.pathname}`;
  } catch { return "(ismeretlen)"; }
}

async function chunked<T>(rows: T[], fn: (part: T[]) => Promise<unknown>, size = 500) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

// ── Fő folyamat ─────────────────────────────────────────────────────────────
async function main() {
  console.log("📊 Elemzési bemutató-adatok (preview)");
  const skip = guardEnvironment();
  if (skip) return console.log(`  kihagyva: ${skip}`);

  const [demoUsers, demoShelterCount] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: "@example.com" } } }),
    prisma.shelter.count({ where: { name: { in: DEMO_SHELTER_NAMES } } }),
  ]);
  if (demoUsers < 20 && demoShelterCount < 5) {
    return console.log(`  kihagyva: nincs bemutató-adat (${demoUsers} @example.com felhasználó, ${demoShelterCount} bemutató-menhely)`);
  }
  console.log(`  cél adatbázis: ${targetHost()}`);
  // Írás csak kifejezett jóváhagyással: a Preview környezetben a
  // SEED_ANALYTICS_CONFIRM_HOST-nak pontosan a cél hostnak kell lennie.
  // Enélkül száraz futás: csak kiírja a hostot, és nem ír semmit.
  const host = (() => { try { return new URL(process.env.DATABASE_URL ?? "").hostname; } catch { return ""; } })();
  if (!LOCAL && (process.env.SEED_ANALYTICS_CONFIRM_HOST ?? "").trim() !== host) {
    return console.log(`  SZÁRAZ FUTÁS: nem írok. Íráshoz a Preview környezetben SEED_ANALYTICS_CONFIRM_HOST=${host} kell.`);
  }
  console.log(`  bemutató-adatbázis: ${demoUsers} @example.com felhasználó, ${demoShelterCount} bemutató-menhely`);

  const shelters = await prisma.shelter.findMany({
    where: { name: { in: DEMO_SHELTER_NAMES } }, select: { id: true, name: true, city: true }, orderBy: { name: "asc" },
  });

  // 1. Örökbefogadók
  const users = Array.from({ length: USER_COUNT }, (_, i) => {
    const n = String(i + 1).padStart(3, "0");
    const [city] = weighted(CITY_WEIGHTS);
    return { id: `${P}-u-${n}`, email: `elemzes-${n}@example.com`, name: `Bemutató Örökbefogadó ${n}`, city, ...household() };
  });
  await chunked(users, (part) => prisma.user.createMany({ data: part, skipDuplicates: true }));

  // 2. Állatok és kérelmek (memóriában előállítva, egyben beszúrva)
  const animals: Record<string, unknown>[] = [];
  const apps: Record<string, unknown>[] = [];
  const images: Record<string, unknown>[] = [];
  let approved = 0, returns = 0, ai = 0, appSeq = 0;
  const appId = () => `${P}-app-${String(++appSeq).padStart(5, "0")}`;
  const userFor = (exclude: Set<string>) => {
    for (;;) { const u = pick(users); if (!exclude.has(u.id)) { exclude.add(u.id); return u; } }
  };
  const addApp = (animalId: string, used: Set<string>, status: ApplicationStatus, createdAt: Date, reviewedAt: Date | null) => {
    const u = userFor(used);
    apps.push({
      id: appId(), userId: u.id, animalId, status, createdAt, reviewedAt,
      homeType: u.homeType, hasGarden: u.hasGarden, hasChildren: u.hasChildren, hasPets: u.hasPets,
      message: "Bemutató kérelem az elemzési adatokhoz.",
    });
  };

  while (approved < TARGET_APPROVED) {
    ai++;
    const id = `${P}-a-${String(ai).padStart(5, "0")}`;
    const type = weighted([[AnimalType.DOG, 55], [AnimalType.CAT, 35], [AnimalType.RABBIT, 5], [AnimalType.BIRD, 2], [AnimalType.OTHER, 3]] as const);
    const name = pick(NAMES[type]);
    const shelter = shelters[Math.floor(Math.pow(rnd(), 1.3) * shelters.length)];
    const arrivedAt = seasonalDate(addDays(WINDOW_START, -60), addDays(ANCHOR, -10));
    // Örökbefogadás: a tartózkodás után, a nyári hónapokat előnyben részesítve
    let adoptAt: Date;
    do { adoptAt = addDays(arrivedAt, Math.min(400, Math.max(3, logNormal(STAY_MEDIAN[type])))); }
    while (rnd() > seasonal(adoptAt) && adoptAt < ANCHOR);
    const used = new Set<string>();
    let status: AnimalStatus = AnimalStatus.AVAILABLE;
    let adoptedAt: Date | null = null;

    if (adoptAt <= ANCHOR) {
      // Esetleges elutasított / visszavont kérelem a sikeres előtt
      if (rnd() < 0.3) addApp(id, used, ApplicationStatus.REJECTED, addDays(adoptAt, -int(15, 30)), addDays(adoptAt, -int(8, 14)));
      if (rnd() < 0.08) addApp(id, used, ApplicationStatus.WITHDRAWN, addDays(adoptAt, -int(12, 25)), null);
      addApp(id, used, ApplicationStatus.APPROVED, addDays(adoptAt, -int(2, 10)), adoptAt);
      approved++; status = AnimalStatus.ADOPTED; adoptedAt = adoptAt;

      // Visszahozás, majd második örökbefogadás egy másik gazdánál
      if (rnd() < RETURN_RATE && adoptAt < addDays(ANCHOR, -60)) {
        const returnedAt = addDays(adoptAt, int(14, 120));
        const secondAt = addDays(returnedAt, Math.max(5, logNormal(30)));
        if (secondAt <= ANCHOR) {
          addApp(id, used, ApplicationStatus.APPROVED, addDays(secondAt, -int(2, 7)), secondAt);
          approved++; returns++; adoptedAt = secondAt;
        } else {
          status = AnimalStatus.AVAILABLE; adoptedAt = null; // visszahozva, újra gazdira vár
        }
      }
    } else if (rnd() < 0.45) {
      // Jelenleg a menhelyen: függő vagy elbírálás alatti kérelemmel
      const st = rnd() < 0.6 ? ApplicationStatus.PENDING : ApplicationStatus.REVIEWING;
      addApp(id, used, st, addDays(ANCHOR, -int(1, 9)), null);
      if (st === ApplicationStatus.REVIEWING) status = AnimalStatus.PENDING;
    }

    animals.push({
      id, shelterId: shelter.id, name, slug: `elemzes-${ai}-${slugify(name)}`, type,
      breed: pick(BREEDS[type]), age: Math.round(Math.min(180, Math.max(2, logNormal(28, 0.9)))),
      size: type === "DOG" ? pick(SIZES) : "SMALL", gender: rnd() < 0.5 ? "MALE" : "FEMALE",
      isVaccinated: rnd() < 0.85, isNeutered: rnd() < 0.7, isMicrochipped: type === "DOG" ? rnd() < 0.9 : rnd() < 0.4,
      description: "Bemutató állat az elemzési adatokhoz.", status, arrivedAt, adoptedAt, createdAt: arrivedAt,
    });
    if (status !== AnimalStatus.ADOPTED) {
      const url = pickFrom(DEMO_IMAGE_POOL[type], id);
      if (url) images.push({ id: `${P}-img-${ai}`, animalId: id, url, alt: name, isPrimary: true, order: 0 });
    }
  }

  // 3. Kapacitás: célzott foglaltság menhelyenként (40–110%, néhány túlzsúfolt).
  //    Ha egy menhelyen túl kevés állat van a célhoz, a hiányt jelenleg
  //    gazdira váró bemutató-állatokkal pótoljuk.
  const occupiedNow = new Map<string, number>();
  const existing = await prisma.animal.groupBy({
    by: ["shelterId"], where: { shelterId: { in: shelters.map((s) => s.id) }, status: { in: [AnimalStatus.AVAILABLE, AnimalStatus.PENDING] }, NOT: { id: { startsWith: `${P}-` } } },
    _count: { _all: true },
  });
  for (const e of existing) occupiedNow.set(e.shelterId, e._count._all);
  for (const a of animals) if (a.status !== AnimalStatus.ADOPTED) occupiedNow.set(a.shelterId as string, (occupiedNow.get(a.shelterId as string) ?? 0) + 1);

  const capacities: { id: string; capacity: number; target: number }[] = [];
  shelters.forEach((s, i) => {
    const r = mulberry32(1000 + i)();
    const target = i % 5 === 2 ? 1.02 + r * 0.08 : 0.4 + r * 0.58; // minden ötödik túlzsúfolt
    let occupied = occupiedNow.get(s.id) ?? 0;
    let capacity = Math.round(occupied / target);
    if (capacity < 15) {
      capacity = 15 + Math.floor(r * 10);
      const need = Math.ceil(capacity * target) - occupied;
      for (let k = 1; k <= need; k++) {
        const id = `${P}-r-${i}-${k}`;
        const type = rnd() < 0.6 ? AnimalType.DOG : AnimalType.CAT;
        const name = pick(NAMES[type]);
        animals.push({
          id, shelterId: s.id, name, slug: `elemzes-r${i}-${k}-${slugify(name)}`, type, breed: pick(BREEDS[type]),
          age: int(4, 90), size: type === "DOG" ? pick(SIZES) : "SMALL", gender: rnd() < 0.5 ? "MALE" : "FEMALE",
          isVaccinated: true, isNeutered: rnd() < 0.6, isMicrochipped: type === "DOG",
          description: "Bemutató állat az elemzési adatokhoz.", status: AnimalStatus.AVAILABLE,
          arrivedAt: addDays(ANCHOR, -int(5, 120)), createdAt: addDays(ANCHOR, -int(5, 120)),
        });
        const url = pickFrom(DEMO_IMAGE_POOL[type], id);
        if (url) images.push({ id: `${P}-img-r-${i}-${k}`, animalId: id, url, alt: name, isPrimary: true, order: 0 });
      }
      occupied = Math.max(occupied, Math.ceil(capacity * target));
    }
    capacity = Math.min(80, capacity);
    capacities.push({ id: s.id, capacity, target: occupied / capacity });
  });

  // 4. Beszúrás (rögzített azonosítók + skipDuplicates → nem duplikál)
  await chunked(animals, (part) => prisma.animal.createMany({ data: part as never, skipDuplicates: true }));
  await chunked(images, (part) => prisma.animalImage.createMany({ data: part as never, skipDuplicates: true }));
  await chunked(apps, (part) => prisma.adoptionApplication.createMany({ data: part as never, skipDuplicates: true }));
  for (const c of capacities) await prisma.shelter.update({ where: { id: c.id }, data: { capacity: c.capacity } });

  // 5. Bejelentések
  const reports: Record<string, unknown>[] = [];
  for (let i = 1; i <= REPORT_COUNT; i++) {
    const [city, lat, lng, spread] = weighted(CITY_WEIGHTS);
    const createdAt = seasonalDate(WINDOW_START, ANCHOR);
    const type = weighted([[ReportType.LOST, 50], [ReportType.FOUND, 38], [ReportType.STRAY, 12]] as const);
    const animalType = rnd() < 0.62 ? AnimalType.DOG : AnimalType.CAT;
    const ageDays = (ANCHOR.getTime() - createdAt.getTime()) / DAY;
    const status = rnd() < 0.35 ? ReportStatus.RESOLVED
      : ageDays > 90 && rnd() < 0.45 ? ReportStatus.CLOSED : ReportStatus.ACTIVE;
    const what = type === "LOST" ? "Elveszett" : type === "FOUND" ? "Megtaláltam" : "Kóbor";
    reports.push({
      id: `${P}-rep-${String(i).padStart(4, "0")}`, type, animalType, city,
      name: type === "LOST" ? pick(NAMES[animalType]) : null, breed: pick(BREEDS[animalType]),
      description: `${what} ${animalType === "DOG" ? "kutya" : "macska"} ${city} környékén. Bemutató bejelentés az elemzési adatokhoz.`,
      lat: +(lat + (rnd() - 0.5) * 2 * spread).toFixed(6), lng: +(lng + (rnd() - 0.5) * 2 * spread * 1.4).toFixed(6),
      contactName: "Bemutató bejelentő", contactEmail: "elemzes-bejelento@example.com", status, createdAt,
    });
  }
  await chunked(reports, (part) => prisma.animalReport.createMany({ data: part as never, skipDuplicates: true }));

  // 6. Összegzés
  const utils = capacities.map((c) => c.target);
  const avg = utils.reduce((s, x) => s + x, 0) / Math.max(1, utils.length);
  console.log(`  állatok: ${animals.length}, kérelmek: ${apps.length} (APPROVED: ${approved}, ebből visszahozás utáni: ${returns}, ${(100 * returns / approved).toFixed(1)}%)`);
  console.log(`  bejelentések: ${reports.length}, örökbefogadók: ${users.length}`);
  console.log(`  kapacitás: ${capacities.length} menhely, foglaltság ${Math.round(100 * Math.min(...utils))}–${Math.round(100 * Math.max(...utils))}%, átlag ${Math.round(100 * avg)}%`);
  console.log("✅ Elemzési bemutató-adatok kész");
}

main()
  .catch((e) => { console.error("Elemzési seed hiba (a build folytatódik):", e); })
  .finally(() => prisma.$disconnect());
