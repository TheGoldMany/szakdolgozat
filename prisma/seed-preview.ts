/**
 * Előnézeti adatfeltöltés – csak Vercel Preview buildben fut.
 *
 * A preview adatbázisában a bemutató-adatok (menhelyek, állatok) már
 * megvannak, de hiányzott minden, amit a régi seed nem tudott: cikkek,
 * állatorvosok a térképen, térképre tehető bejelentések, közelgő események,
 * napi képek, és törött volt minden kép (loremflickr). Ez a script ezeket
 * pótolja.
 *
 * BIZTONSÁG – három, egymástól független feltétel:
 *   1. `VERCEL_ENV === "preview"` (helyben csak kifejezett kapcsolóval és
 *      localhost adatbázissal fut).
 *   2. Az adatbázisban már bemutató-adat van: legalább 20 `@example.com`
 *      felhasználó. Valódi (éles) adatbázisban ilyen nincs, így ha egy
 *      preview véletlenül az éles adatbázisra mutatna, a script nem nyúl hozzá.
 *   3. Csak hozzáad és bemutató-képet cserél. Semmit nem töröl, valódi
 *      feltöltésekhez (Vercel Blob) nem nyúl.
 *
 * Újrafuttatható: minden lépés előbb megnézi, kell-e még.
 * A build sosem bukik el miatta: hiba esetén csak naplóz.
 */

import {
  PrismaClient,
  AnimalType,
  ReportType,
  EventType,
  Role,
} from "@prisma/client";
import { DEMO_IMAGE_POOL, isDemoImageUrl, pickFrom } from "../lib/demo-images";

const LOCAL = process.env.SEED_PREVIEW_LOCAL === "1";

function guardEnvironment(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  if (!/^postgres(ql)?:\/\//.test(url)) return "nincs érvényes DATABASE_URL";
  if (process.env.VERCEL_ENV === "preview") return null;
  if (LOCAL && /@(localhost|127\.0\.0\.1)[:/]/.test(url)) return null;
  return `VERCEL_ENV=${process.env.VERCEL_ENV ?? "(üres)"}, nem preview`;
}

const prisma = new PrismaClient();

// ── Segédek ────────────────────────────────────────────────────────────────

const CITIES: { name: string; zip: string; lat: number; lng: number }[] = [
  { name: "Budapest",       zip: "1117", lat: 47.4979, lng: 19.0402 },
  { name: "Debrecen",       zip: "4024", lat: 47.5316, lng: 21.6273 },
  { name: "Szeged",         zip: "6720", lat: 46.2530, lng: 20.1414 },
  { name: "Miskolc",        zip: "3525", lat: 48.1035, lng: 20.7784 },
  { name: "Pécs",           zip: "7621", lat: 46.0727, lng: 18.2323 },
  { name: "Győr",           zip: "9021", lat: 47.6875, lng: 17.6504 },
  { name: "Nyíregyháza",    zip: "4400", lat: 47.9554, lng: 21.7167 },
  { name: "Kecskemét",      zip: "6000", lat: 46.8964, lng: 19.6897 },
  { name: "Székesfehérvár", zip: "8000", lat: 47.1860, lng: 18.4221 },
  { name: "Szombathely",    zip: "9700", lat: 47.2307, lng: 16.6218 },
  { name: "Érd",            zip: "2030", lat: 47.3919, lng: 18.9046 },
  { name: "Tatabánya",      zip: "2800", lat: 47.5692, lng: 18.4048 },
  { name: "Kaposvár",       zip: "7400", lat: 46.3594, lng: 17.7968 },
  { name: "Veszprém",       zip: "8200", lat: 47.0930, lng: 17.9093 },
  { name: "Eger",           zip: "3300", lat: 47.9025, lng: 20.3772 },
  { name: "Sopron",         zip: "9400", lat: 47.6817, lng: 16.5845 },
];

/** Determinisztikus „véletlen”, hogy újrafuttatáskor ugyanaz jöjjön ki. */
function seeded(n: number): number {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
function jitter(base: number, i: number, spread = 0.03) {
  return base + (seeded(i) - 0.5) * spread * 2;
}

async function inChunks<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

// ── 1. Képek ellenőrzése ──────────────────────────────────────────────────

async function imageLoads(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-2047" },
      signal: AbortSignal.timeout(8000),
    });
    const type = res.headers.get("content-type") ?? "";
    return (res.status === 200 || res.status === 206) && type.startsWith("image/");
  } catch {
    return false;
  }
}

async function verifiedPool(): Promise<Record<AnimalType, string[]> & { ANY: string[] }> {
  const assumeOk = LOCAL && process.env.SEED_PREVIEW_ASSUME_IMAGES_OK === "1";
  const out = {} as Record<AnimalType, string[]>;
  for (const [type, urls] of Object.entries(DEMO_IMAGE_POOL) as [AnimalType, string[]][]) {
    const ok = await Promise.all(urls.map(async (u) => ((assumeOk || (await imageLoads(u))) ? u : null)));
    out[type] = ok.filter((u): u is string => !!u);
    console.log(`  képek ${type}: ${out[type].length}/${urls.length} tölthető be`);
  }
  // Ha egy fajhoz egy kép sem jó, a kutya/macska képekből kap – jobb, mint a törött kép.
  const any = [...out.DOG, ...out.CAT];
  for (const t of Object.keys(out) as AnimalType[]) if (out[t].length === 0) out[t] = any;
  return { ...out, ANY: any };
}

// ── 2. Törött bemutató-képek cseréje ──────────────────────────────────────

async function fixImages(pool: Awaited<ReturnType<typeof verifiedPool>>) {
  const good = new Set(Object.values(pool).flat());
  const broken = (url: string | null | undefined) => isDemoImageUrl(url) && !good.has(url!);
  const forType = (t: AnimalType | null | undefined, key: string) =>
    pickFrom(t ? pool[t] : pool.ANY, key) ?? null;

  if (pool.ANY.length === 0) {
    console.log("  ⚠️  egyetlen bemutató-kép sem tölthető be – a képcserét kihagyom");
    return;
  }

  const animalImages = await prisma.animalImage.findMany({
    where: { OR: [{ url: { contains: "loremflickr.com" } }, { url: { contains: "images.unsplash.com" } }] },
    select: { id: true, url: true, order: true, animalId: true, animal: { select: { type: true } } },
  });
  const ai = animalImages.filter((r) => broken(r.url));
  await inChunks(ai, 25, (r) =>
    prisma.animalImage.update({
      where: { id: r.id },
      data:  { url: forType(r.animal.type, `${r.animalId}:${r.order}`)! },
    }),
  );

  const reports = await prisma.animalReport.findMany({
    where:  { imageUrl: { not: null } },
    select: { id: true, imageUrl: true, animalType: true },
  });
  const rp = reports.filter((r) => broken(r.imageUrl));
  await inChunks(rp, 25, (r) =>
    prisma.animalReport.update({ where: { id: r.id }, data: { imageUrl: forType(r.animalType, r.id) } }),
  );

  const reportImages = await prisma.reportImage.findMany({
    select: { id: true, url: true, reportId: true, order: true, report: { select: { animalType: true } } },
  });
  const ri = reportImages.filter((r) => broken(r.url));
  await inChunks(ri, 25, (r) =>
    prisma.reportImage.update({
      where: { id: r.id },
      data:  { url: forType(r.report.animalType, `${r.reportId}:${r.order}`)! },
    }),
  );

  let other = 0;
  for (const c of await prisma.campaign.findMany({ select: { id: true, imageUrl: true, animal: { select: { type: true } } } })) {
    if (!broken(c.imageUrl)) continue;
    await prisma.campaign.update({ where: { id: c.id }, data: { imageUrl: forType(c.animal?.type, c.id) } });
    other++;
  }
  for (const e of await prisma.event.findMany({ select: { id: true, imageUrl: true } })) {
    if (!broken(e.imageUrl)) continue;
    await prisma.event.update({ where: { id: e.id }, data: { imageUrl: forType(null, e.id) } });
    other++;
  }
  for (const p of await prisma.post.findMany({ select: { id: true, imageUrl: true } })) {
    if (!broken(p.imageUrl)) continue;
    await prisma.post.update({ where: { id: p.id }, data: { imageUrl: forType(null, p.id) } });
    other++;
  }
  for (const d of await prisma.dailyPost.findMany({ select: { id: true, imageUrl: true, animal: { select: { type: true } } } })) {
    if (!broken(d.imageUrl)) continue;
    await prisma.dailyPost.update({ where: { id: d.id }, data: { imageUrl: forType(d.animal?.type, d.id)! } });
    other++;
  }
  for (const s of await prisma.shelter.findMany({ select: { id: true, logoUrl: true, coverUrl: true } })) {
    const data: { logoUrl?: null; coverUrl?: string | null } = {};
    // Logónak egy állatfotó nem való: ilyenkor inkább a monogramos jelölés látszik.
    if (broken(s.logoUrl)) data.logoUrl = null;
    if (broken(s.coverUrl)) data.coverUrl = forType(null, s.id);
    if (Object.keys(data).length) {
      await prisma.shelter.update({ where: { id: s.id }, data });
      other++;
    }
  }

  console.log(`  ✓ képcsere: ${ai.length} állatkép, ${rp.length + ri.length} bejelentéskép, ${other} egyéb`);
}

// ── 3. Menhelyek koordinátái (térkép) ──────────────────────────────────────

async function fixShelterCoords() {
  const missing = await prisma.shelter.findMany({
    where:  { OR: [{ lat: null }, { lng: null }] },
    select: { id: true, city: true },
  });
  let n = 0;
  for (const [i, s] of missing.entries()) {
    const c = CITIES.find((x) => x.name === s.city);
    if (!c) continue;
    await prisma.shelter.update({
      where: { id: s.id },
      data:  { lat: jitter(c.lat, i + 1), lng: jitter(c.lng, i + 101) },
    });
    n++;
  }
  console.log(`  ✓ menhely-koordináták pótolva: ${n}`);
}

// ── 4. Állatorvosok ────────────────────────────────────────────────────────

const VETS: { name: string; city: string; street: string; emergency?: boolean; hours: string }[] = [
  { name: "Kertvárosi Állatorvosi Rendelő",    city: "Budapest",       street: "Bartók Béla út 112.", hours: "H–P 8:00–20:00, Szo 9:00–13:00" },
  { name: "Budai Állatkórház",                 city: "Budapest",       street: "Budaörsi út 41.", emergency: true, hours: "Éjjel-nappal nyitva" },
  { name: "Zugló Kisállatrendelő",             city: "Budapest",       street: "Thököly út 150.", hours: "H–P 9:00–19:00" },
  { name: "Nagyerdei Állatorvosi Centrum",     city: "Debrecen",       street: "Egyetem sugárút 22.", emergency: true, hours: "Éjjel-nappal nyitva" },
  { name: "Tisza-parti Kisállatrendelő",       city: "Szeged",         street: "Kossuth Lajos sugárút 60.", hours: "H–P 8:00–19:00, Szo 9:00–12:00" },
  { name: "Avasi Állatorvosi Rendelő",         city: "Miskolc",        street: "Középszer utca 4.", hours: "H–P 9:00–18:00" },
  { name: "Mecsekalji Állatklinika",           city: "Pécs",           street: "Szigeti út 70.", emergency: true, hours: "Éjjel-nappal nyitva" },
  { name: "Rába Kisállatrendelő",              city: "Győr",           street: "Szent István út 18.", hours: "H–P 8:00–20:00" },
  { name: "Sóstói Állatorvosi Rendelő",        city: "Nyíregyháza",    street: "Sóstói út 31.", hours: "H–P 9:00–18:00, Szo 9:00–12:00" },
  { name: "Hírös Állatorvosi Rendelő",         city: "Kecskemét",      street: "Izsáki út 9.", hours: "H–P 8:00–19:00" },
  { name: "Fehérvári Állatkórház",             city: "Székesfehérvár", street: "Palotai út 55.", emergency: true, hours: "Éjjel-nappal nyitva" },
  { name: "Gyöngyös-parti Kisállatrendelő",    city: "Szombathely",    street: "Szelestey László utca 12.", hours: "H–P 9:00–19:00" },
  { name: "Érdligeti Állatorvosi Rendelő",     city: "Érd",            street: "Budai út 27.", hours: "H–P 8:00–18:00" },
  { name: "Gerecse Állatorvosi Rendelő",       city: "Tatabánya",      street: "Győri út 8.", hours: "H–P 9:00–18:00" },
  { name: "Kapos Kisállatrendelő",             city: "Kaposvár",       street: "Füredi utca 46.", hours: "H–P 8:00–19:00, Szo 9:00–12:00" },
  { name: "Bakonyi Állatorvosi Centrum",       city: "Veszprém",       street: "Haszkovó utca 3.", hours: "H–P 8:00–20:00" },
  { name: "Egri Kisállatklinika",              city: "Eger",           street: "Rákóczi Ferenc út 90.", hours: "H–P 9:00–19:00" },
  { name: "Lövérek Állatorvosi Rendelő",       city: "Sopron",         street: "Lackner Kristóf utca 20.", hours: "H–P 9:00–18:00" },
];

async function seedVets() {
  if ((await prisma.vetClinic.count()) > 0) return console.log("  – állatorvosok már vannak");
  await prisma.vetClinic.createMany({
    data: VETS.map((v, i) => {
      const c = CITIES.find((x) => x.name === v.city)!;
      return {
        name:         v.name,
        address:      v.street,
        city:         v.city,
        zipCode:      c.zip,
        phone:        `+36 30 ${String(200 + i * 17).padStart(3, "0")} ${String(1000 + i * 271).slice(0, 4)}`,
        openingHours: v.hours,
        isEmergency:  !!v.emergency,
        note:         "Bemutató adat az előnézeti környezethez.",
        lat:          jitter(c.lat, i + 501, 0.02),
        lng:          jitter(c.lng, i + 601, 0.02),
      };
    }),
  });
  console.log(`  ✓ állatorvosok: ${VETS.length}`);
}

// ── 5. Bejelentések a térképre ────────────────────────────────────────────

const REPORTS: { type: ReportType; animal: AnimalType; name?: string; breed?: string; color: string; desc: string }[] = [
  { type: "LOST",  animal: "DOG", name: "Bodri",  breed: "Keverék",          color: "fekete-fehér", desc: "Séta közben elszakadt a póráza a park mellett. Barátságos, a nevére hallgat. Piros nyakörv van rajta." },
  { type: "LOST",  animal: "CAT", name: "Mici",   breed: "Házi macska",      color: "cirmos",      desc: "Nyitva maradt az erkélyajtó, azóta nem jött haza. Ivartalanított, chipes, kicsit félénk." },
  { type: "FOUND", animal: "DOG",                 breed: "Labrador keverék", color: "világosbarna", desc: "A buszmegállóban ült, nyakörv nélkül. Most nálunk van, jól van, eszik-iszik." },
  { type: "STRAY", animal: "CAT",                                            color: "vörös",       desc: "Napok óta a ház körül jár, nagyon sovány. Megközelíthető, de felvenni nem engedi magát." },
  { type: "LOST",  animal: "DOG", name: "Morzsa", breed: "Tacskó",           color: "barna",       desc: "A kertből szökött ki a kerítés alatt. Idős, rosszul lát, ne kergessék." },
  { type: "FOUND", animal: "CAT",                                            color: "fekete",      desc: "Kölyökmacska a lépcsőházban. Ideiglenesen befogadtuk, a gazdáját keressük." },
  { type: "STRAY", animal: "DOG",                 breed: "Keverék",          color: "szürke",      desc: "Közepes testű kutya kóborol a piac környékén, sántít a hátsó lábára." },
  { type: "LOST",  animal: "RABBIT", name: "Pamacs",                         color: "fehér",       desc: "Törpenyúl, a kertből tűnt el. Nagyon szelíd, a répának nem tud ellenállni." },
  { type: "LOST",  animal: "BIRD", name: "Kiki",  breed: "Hullámos papagáj", color: "zöld-sárga",  desc: "Kirepült az ablakon. Beszél, a nevét mondja. Kérjük, ha látják, jelezzenek." },
  { type: "FOUND", animal: "DOG",                 breed: "Németjuhász",      color: "fekete-cser", desc: "Az út szélén találtuk, chipet olvastattunk, de nem volt regisztrálva." },
  { type: "STRAY", animal: "CAT",                                            color: "teknőctarka", desc: "Kismacskákkal együtt él egy garázs mögött. Ivartalanítás szervezéséhez kérünk segítséget." },
  { type: "LOST",  animal: "CAT", name: "Bajusz", breed: "Brit rövidszőrű",  color: "kékesszürke", desc: "Költözés közben ijedt meg és elszaladt. Lakásmacska, a környéket nem ismeri." },
];

async function seedReports(pool: Awaited<ReturnType<typeof verifiedPool>>) {
  const withCoords = await prisma.animalReport.count({ where: { lat: { not: null }, lng: { not: null } } });
  if (withCoords >= 20) return console.log(`  – bejelentés a térképen már van (${withCoords})`);
  const rows = Array.from({ length: 24 }, (_, i) => {
    const r = REPORTS[i % REPORTS.length];
    const c = CITIES[(i * 5) % CITIES.length];
    const created = new Date(Date.now() - (i * 19 + 3) * 3600_000);
    return {
      type: r.type, animalType: r.animal, name: r.name ?? null, breed: r.breed ?? null,
      color: r.color, description: r.desc, city: c.name,
      lat: jitter(c.lat, i + 701, 0.04), lng: jitter(c.lng, i + 801, 0.04),
      imageUrl: pickFrom(pool[r.animal], `report-${i}`) ?? null,
      contactName: "Bemutató bejelentő", contactEmail: `bejelento-demo${i}@example.com`,
      status: i % 7 === 6 ? ("RESOLVED" as const) : ("ACTIVE" as const),
      createdAt: created, updatedAt: created,
    };
  });
  await prisma.animalReport.createMany({ data: rows });
  console.log(`  ✓ bejelentések koordinátával: ${rows.length}`);
}

// ── 6. Cikkek ──────────────────────────────────────────────────────────────

const ARTICLES: { slug: string; title: string; excerpt: string; tags: string[]; type: AnimalType; body: string[] }[] = [
  {
    slug: "miert-erdemes-idosebb-allatot-orokbefogadni",
    title: "Miért érdemes idősebb állatot örökbefogadni",
    excerpt: "A menhelyeken a felnőtt és idősebb állatok várnak a legtovább gazdára, pedig sok családnak ők a legjobb választás.",
    tags: ["örökbefogadás", "idős állatok"], type: "DOG",
    body: [
      "A menhelyeken a kölykök általában hetek alatt gazdára találnak, a hét év feletti kutyák és macskák viszont sokszor hónapokig, akár évekig várnak. Pedig egy felnőtt állattal sok szempontból könnyebb az élet.",
      "Az idősebb állat természete már kialakult. A menhely munkatársai pontosan el tudják mondani, hogyan viselkedik gyerekekkel, más állatokkal vagy egyedül hagyva. Kölyöknél ez sokszor csak tipp.",
      "A legtöbb felnőtt kutya már szobatiszta, ismeri az alapvezényszavakat, és nem rágja szét a cipőket. A nyugodtabb életritmus dolgozó családoknak és idősebb gazdiknak is jobban illik.",
      "Érdemes számolni azzal, hogy idős korban gyakoribb az állatorvosi vizit. Kérdezd meg a menhelyet az állat egészségi állapotáról és arról, milyen kezelést kapott eddig.",
    ],
  },
  {
    slug: "az-elso-het-az-uj-kutyaval",
    title: "Az első hét az új kutyával",
    excerpt: "Mire készülj, ha hazaviszed a menhelyről a kutyádat, és hogyan segítheted, hogy hamar otthon érezze magát.",
    tags: ["kutya", "első lépések"], type: "DOG",
    body: [
      "Az első napokban a kutya mindent most lát először: az új szagokat, hangokat, embereket. Ilyenkor sokszor visszahúzódó, vagy épp nyugtalan. Ez teljesen természetes.",
      "Alakíts ki neki egy csendes helyet, ahol senki nem zavarja. Egy fekhely egy kevésbé forgalmas sarokban többet ér, mint a nappali közepe.",
      "Az első héten ne vigyél sok vendéget a lakásba, és a hosszú kirándulásokat is hagyd későbbre. A rövid, rendszeres séták és az állandó etetési idő adják a biztonságérzetet.",
      "Ha bármi szokatlant tapasztalsz, nyugodtan hívd fel a menhelyet. Ismerik az állatot, és szívesen segítenek a beilleszkedésben.",
    ],
  },
  {
    slug: "mit-tegyel-ha-elveszett-a-kutyad",
    title: "Mit tegyél, ha elveszett a kutyád",
    excerpt: "Az első órák a legfontosabbak. Lépésről lépésre, mit érdemes azonnal megtenni.",
    tags: ["elveszett kutya", "bejelentés"], type: "DOG",
    body: [
      "Ha a kutyád elszökött, először járd végig a közvetlen környéket. A legtöbb kutya néhány száz méteren belül marad, főleg ha megijedt.",
      "Adj fel bejelentést az oldalon fotóval és pontos helyszínnel. A bejelentés megjelenik a térképen, így a környéken élők könnyebben felismerik az állatot.",
      "Hívd fel a környékbeli menhelyeket és állatorvosokat. Ha a kutya chipes, ellenőrizd, hogy a nyilvántartásban a jelenlegi telefonszámod szerepel-e.",
      "Ne add fel az első napok után sem. Sok kutya hetekkel később kerül elő, és a megosztott bejelentések ebben sokat segítenek.",
    ],
  },
  {
    slug: "macska-orokbefogadas-kerdesek",
    title: "Öt kérdés, mielőtt macskát fogadsz örökbe",
    excerpt: "Lakás vagy kert, egy macska vagy kettő, kölyök vagy felnőtt? Ezeket érdemes előre végiggondolni.",
    tags: ["macska", "örökbefogadás"], type: "CAT",
    body: [
      "Bent tartott vagy kijáró macskát szeretnél? Lakásban élő macskánál a hálós erkély és a játékra szánt idő különösen fontos.",
      "Egy macska vagy kettő? A kölykök és a fiatal macskák sokszor jobban érzik magukat egy társsal, a menhely meg tudja mondani, melyik állat milyen.",
      "Mennyi időt töltesz otthon? A macska önállóbb a kutyánál, de neki is kell a figyelem és a közös játék.",
      "Van-e már állat a háznál? Az összeszoktatás néhány hét türelmet kíván, erről a menhely munkatársai sok hasznos tanácsot tudnak adni.",
      "Készen állsz a költségekre? Az eledel és az alom mellett az évenkénti oltással és az esetleges kezelésekkel is számolni kell.",
    ],
  },
  {
    slug: "ideiglenes-befogadas-hogyan-mukodik",
    title: "Ideiglenes befogadás: hogyan működik",
    excerpt: "Ha nem tudsz végleg állatot tartani, ideiglenes befogadóként is sokat segíthetsz egy menhelynek.",
    tags: ["ideiglenes befogadás", "önkéntesség"], type: "CAT",
    body: [
      "Az ideiglenes befogadó néhány hétig vagy hónapig otthont ad egy állatnak, amíg végleges gazdára talál. Ezzel helyet szabadít fel a menhelyen egy újabb rászorulónak.",
      "A menhelyek általában biztosítják az állatorvosi ellátást, sokszor az eledelt is. Ezt mindig előre egyeztetni kell, menhelyenként eltér.",
      "Különösen nagy szükség van befogadókra kölyökszezonban, illetve műtét után lábadozó állatok mellé.",
      "Az oldalon a menhely profiljánál jelentkezhetsz ideiglenes befogadónak. A menhely felveszi veled a kapcsolatot, és megbeszélitek a részleteket.",
    ],
  },
  {
    slug: "ivartalanitas-tenyek-es-tevhitek",
    title: "Ivartalanítás: tények és tévhitek",
    excerpt: "Elhízik tőle? Kell előtte egy alom? A leggyakoribb kérdések az ivartalanításról.",
    tags: ["egészség", "ivartalanítás"], type: "CAT",
    body: [
      "Az ivartalanítás az egyik leghatékonyabb módja annak, hogy kevesebb nem kívánt alom szülessen, és kevesebb állat kerüljön utcára.",
      "Nem igaz, hogy a nőstényeknek előtte egyszer szülniük kell. Az állatorvosok szerint ennek nincs egészségügyi előnye.",
      "Az elhízás nem a műtét, hanem a változatlan adag miatt jelentkezik. Az anyagcsere lassul, ezért érdemes az etetést az állatorvossal egyeztetni.",
      "A menhelyekről örökbefogadott állatok többsége már ivartalanítva kerül új gazdájához.",
    ],
  },
  {
    slug: "nyuszi-a-lakasban",
    title: "Nyúl a lakásban: amit tudni érdemes",
    excerpt: "A nyúl nem kezdőknek való kisállat. Mire van szüksége, hogy egészséges és nyugodt legyen?",
    tags: ["nyúl", "tartás"], type: "RABBIT",
    body: [
      "A nyúl társas állat, sok időt igényel, és akár tíz évig is élhet. Érdemes ezzel számolni, mielőtt örökbefogadod.",
      "Egy kis ketrec nem elég: naponta több órát kell szabadon mozognia egy biztonságos, kábelektől mentes területen.",
      "Az étrend alapja a széna, mellé friss zöldség. A sok répa és gyümölcs inkább csak jutalomnak való.",
      "Fontos, hogy legyen a környéken nyulakhoz értő állatorvos. A térképen megtalálod a hozzád legközelebbi rendelőket.",
    ],
  },
  {
    slug: "onkenteskedes-a-menhelyen",
    title: "Önkénteskedés a menhelyen",
    excerpt: "Sétáltatás, takarítás, fotózás, szállítás: sokféleképpen lehet segíteni, és mindegyikre szükség van.",
    tags: ["önkéntesség", "menhely"], type: "DOG",
    body: [
      "A menhelyek nagy része kevés fizetett munkatárssal működik, az önkéntesek nélkül sok minden nem valósulna meg.",
      "A legismertebb feladat a kutyasétáltatás, de legalább ilyen fontos a takarítás, az adminisztráció vagy a jó fotók készítése az állatokról.",
      "Ha autód van, szállításban is segíthetsz: állatorvoshoz, örökbefogadási napokra, vagy adományok átvételekor.",
      "Az oldalon a menhely profiljánál jelentkezhetsz önkéntesnek. A menhely visszajelez, és megbeszélitek, mikor és miben tudsz segíteni.",
    ],
  },
];

async function seedArticles(pool: Awaited<ReturnType<typeof verifiedPool>>) {
  const author = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN }, select: { id: true } });
  let created = 0;
  for (const [i, a] of ARTICLES.entries()) {
    const exists = await prisma.post.findUnique({ where: { slug: a.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.post.create({
      data: {
        slug: a.slug, title: a.title, excerpt: a.excerpt, content: a.body.join("\n\n"),
        imageUrl: pickFrom(pool[a.type], a.slug) ?? null,
        publishedAt: new Date(Date.now() - (i * 6 + 1) * 24 * 3600_000),
        tags: a.tags, keywords: a.tags, focusKeyword: a.tags[0],
        seoTitle: a.title, metaDescription: a.excerpt,
        authorId: author?.id ?? null,
      },
    });
    created++;
  }
  console.log(`  ✓ cikkek: ${created} új (${ARTICLES.length - created} már megvolt)`);
}

// ── 7. Közelgő események ──────────────────────────────────────────────────

async function seedEvents(pool: Awaited<ReturnType<typeof verifiedPool>>) {
  const upcoming = await prisma.event.count({ where: { status: "PUBLISHED", startsAt: { gt: new Date() } } });
  if (upcoming >= 3) return console.log(`  – közelgő esemény már van (${upcoming})`);
  const shelters = await prisma.shelter.findMany({
    where: { isActive: true }, select: { id: true, name: true, city: true, address: true }, take: 4, orderBy: { name: "asc" },
  });
  const plans: { type: EventType; title: string; desc: string; days: number; hours: number }[] = [
    { type: "ADOPTION_DAY",  title: "Örökbefogadási nap",          days: 6,  hours: 4, desc: "Gyere el és ismerkedj meg a gazdira váró kutyákkal és macskákkal. A munkatársak a helyszínen válaszolnak az örökbefogadással kapcsolatos kérdésekre." },
    { type: "OPEN_DAY",      title: "Nyílt nap a menhelyen",        days: 13, hours: 5, desc: "Körbevezetünk a menhelyen, bemutatjuk a mindennapi munkát, és elmondjuk, hogyan segíthetsz önkéntesként vagy ideiglenes befogadóként." },
    { type: "VOLUNTEER_DAY", title: "Közös kutyasétáltatás",         days: 9,  hours: 3, desc: "Csatlakozz a hétvégi közös sétához! Pórázt és jutalomfalatot biztosítunk, csak kényelmes cipőt hozz." },
    { type: "EDUCATION",     title: "Előadás: felelős állattartás", days: 20, hours: 2, desc: "Állatorvos vendégünk az oltásokról, a chipezésről és az ivartalanításról beszél, utána kérdezni is lehet." },
  ];
  let created = 0;
  for (const [i, s] of shelters.entries()) {
    const p = plans[i % plans.length];
    const slug = `elonezet-${p.type.toLowerCase().replace(/_/g, "-")}-${s.id.slice(-6)}`;
    if (await prisma.event.findUnique({ where: { slug }, select: { id: true } })) continue;
    const start = new Date();
    start.setDate(start.getDate() + p.days);
    start.setHours(10, 0, 0, 0);
    await prisma.event.create({
      data: {
        shelterId: s.id, title: `${p.title} – ${s.name}`, slug, description: p.desc, type: p.type,
        location: `${s.address}, ${s.city}`, startsAt: start,
        endsAt: new Date(start.getTime() + p.hours * 3600_000),
        capacity: i % 2 === 0 ? 40 : null, status: "PUBLISHED",
        imageUrl: pickFrom(pool.ANY, slug) ?? null,
      },
    });
    created++;
  }
  console.log(`  ✓ közelgő események: ${created}`);
}

// ── 8. Napi képek ─────────────────────────────────────────────────────────

async function seedDailyPosts() {
  // A napi képfolyam 24 órás: ha a legutóbbi kép régebbi, újakat teszünk fel,
  // hogy a preview megnyitásakor ne legyen üres.
  const recent = await prisma.dailyPost.count({ where: { createdAt: { gt: new Date(Date.now() - 20 * 3600_000) } } });
  if (recent >= 6) return console.log(`  – friss napi kép már van (${recent})`);
  const admins = await prisma.shelterAdmin.findMany({ select: { userId: true, shelterId: true }, take: 8 });
  const captions = [
    "Reggeli séta után. Ő ma különösen jókedvű volt.",
    "Új lakónk megérkezett, még ismerkedik a helyével.",
    "Délutáni szieszta a napon.",
    "Ma volt az első közös játék az udvaron.",
    "Fürdés után, kicsit sértődötten.",
    "Ő még mindig gazdira vár. Ugye milyen szép?",
  ];
  let created = 0;
  for (const [i, a] of admins.entries()) {
    const animal = await prisma.animal.findFirst({
      where:  { shelterId: a.shelterId, status: "AVAILABLE", images: { some: {} } },
      select: { id: true, images: { select: { url: true }, take: 1, orderBy: { order: "asc" } } },
      skip:   i % 3,
    });
    const url = animal?.images[0]?.url;
    if (!animal || !url) continue;
    await prisma.dailyPost.create({
      data: {
        authorId: a.userId, animalId: animal.id, imageUrl: url,
        caption: captions[i % captions.length],
        createdAt: new Date(Date.now() - (i * 2 + 1) * 3600_000),
      },
    });
    created++;
  }
  console.log(`  ✓ napi képek: ${created}`);
}

// ── Futtatás ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Előnézeti adatfeltöltés");
  const skip = guardEnvironment();
  if (skip) return console.log(`  kihagyva: ${skip}`);

  const demoUsers = await prisma.user.count({ where: { email: { endsWith: "@example.com" } } });
  if (demoUsers < 20) {
    return console.log(`  kihagyva: az adatbázisban nincs bemutató-adat (${demoUsers} @example.com felhasználó), nem nyúlok hozzá`);
  }

  const pool = await verifiedPool();
  await fixImages(pool);
  await fixShelterCoords();
  await seedVets();
  await seedReports(pool);
  await seedArticles(pool);
  await seedEvents(pool);
  await seedDailyPosts();
  console.log("✅ Előnézeti adatfeltöltés kész");
}

// A build sosem várhat rá a végtelenségig, és sosem bukhat el miatta.
const timer = setTimeout(() => {
  console.log("  ⚠️  időtúllépés, a feltöltés megszakítva (a build folytatódik)");
  process.exit(0);
}, 180_000);

main()
  .catch((e) => console.error("  ⚠️  előnézeti feltöltés hiba (a build folytatódik):", e))
  .finally(async () => {
    clearTimeout(timer);
    await prisma.$disconnect();
  });
