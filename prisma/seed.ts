import {
  PrismaClient,
  AnimalType,
  AnimalSize,
  AnimalStatus,
  Role,
  ApplicationStatus,
  ReportType,
  ReportStatus,
  CampaignStatus,
  HealthRecordType,
  AppointmentStatus,
  VolunteerStatus,
  InventoryCategory,
  InventoryTxType,
  FollowUpStatus,
  NotificationType,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// DATABASE_URL betöltése .env / .env.local fájlból (ts-node nem tölti auto)
for (const envFile of [".env", ".env.local"]) {
  const fp = resolve(process.cwd(), envFile);
  if (!existsSync(fp)) continue;
  readFileSync(fp, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([^#=][^=]*)=(.+)$/);
    if (!m) return;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  });
}

const prisma = new PrismaClient();

// ── Segédfüggvények ───────────────────────────────────

function rnd<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function rndBool(p = 0.5) {
  return Math.random() < p;
}
function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Konstansok ────────────────────────────────────────

const NUM_SHELTERS = 500;
const NUM_USERS    = 200;
const BATCH        = 500;

const CITIES = [
  { name: "Budapest",           zip: 1100 },
  { name: "Debrecen",           zip: 4025 },
  { name: "Miskolc",            zip: 3527 },
  { name: "Pécs",               zip: 7621 },
  { name: "Győr",               zip: 9021 },
  { name: "Nyíregyháza",        zip: 4400 },
  { name: "Kecskemét",          zip: 6000 },
  { name: "Székesfehérvár",     zip: 8000 },
  { name: "Szombathely",        zip: 9700 },
  { name: "Érd",                zip: 2030 },
  { name: "Tatabánya",          zip: 2800 },
  { name: "Kaposvár",           zip: 7400 },
  { name: "Sopron",             zip: 9400 },
  { name: "Eger",               zip: 3300 },
  { name: "Nagykanizsa",        zip: 8800 },
  { name: "Veszprém",           zip: 8200 },
  { name: "Zalaegerszeg",       zip: 8900 },
  { name: "Szolnok",            zip: 5000 },
  { name: "Esztergom",          zip: 2500 },
  { name: "Dunaújváros",        zip: 2400 },
  { name: "Hódmezővásárhely",   zip: 6800 },
  { name: "Salgótarján",        zip: 3100 },
  { name: "Cegléd",             zip: 2700 },
  { name: "Gyöngyös",           zip: 3200 },
  { name: "Baja",               zip: 6500 },
  { name: "Mosonmagyaróvár",    zip: 9200 },
  { name: "Pápa",               zip: 8500 },
  { name: "Ajka",               zip: 8400 },
  { name: "Kazincbarcika",      zip: 3700 },
  { name: "Orosháza",           zip: 5900 },
  { name: "Békéscsaba",         zip: 5600 },
  { name: "Szekszárd",          zip: 7100 },
  { name: "Komárom",            zip: 2900 },
  { name: "Hatvan",             zip: 3000 },
  { name: "Balassagyarmat",     zip: 2660 },
  { name: "Siófok",             zip: 8600 },
  { name: "Balatonfüred",       zip: 8230 },
  { name: "Keszthely",          zip: 8360 },
  { name: "Marcali",            zip: 8700 },
  { name: "Dombóvár",           zip: 7200 },
  { name: "Bonyhád",            zip: 7150 },
  { name: "Mohács",             zip: 7700 },
  { name: "Siklós",             zip: 7800 },
  { name: "Mátészalka",         zip: 4700 },
  { name: "Kisvárda",           zip: 4600 },
  { name: "Fehérgyarmat",       zip: 4900 },
  { name: "Hajdúböszörmény",    zip: 4220 },
  { name: "Hajdúszoboszló",     zip: 4200 },
  { name: "Berettyóújfalu",     zip: 4100 },
  { name: "Makó",               zip: 6900 },
];

// 25 × 20 = 500 kombinált menhelynév
const SHELTER_PREFIXES = [
  "Mancs", "Tappancs", "Szív", "Hűség", "Remény",
  "Boldogság", "Vidám", "Szőrös", "Örömtanya", "Kedves",
  "Szelíd", "Gondoskodó", "Szerető", "Játékos", "Barátságos",
  "Csillag", "Nap", "Hold", "Magyar", "Négy Láb",
  "Kapaszkodó", "Hűséges", "Boldog", "Kis", "Szabad",
];

const SHELTER_SUFFIXES = [
  "Állatvédők", "Menhely", "Alapítvány", "Egyesület", "Állatmenház",
  "Otthon", "Menedék", "Ház", "Szervezet", "Közösség",
  "Barátok", "Segítők", "Védők", "Mentők", "Gondozó",
  "Centrum", "Tanya", "Projekt", "Csoport", "Társaság",
];

const SHELTER_NAMES: string[] = [];
outer: for (const prefix of SHELTER_PREFIXES) {
  for (const suffix of SHELTER_SUFFIXES) {
    SHELTER_NAMES.push(`${prefix} ${suffix}`);
    if (SHELTER_NAMES.length === NUM_SHELTERS) break outer;
  }
}

const DOG_NAMES = [
  "Bodri", "Morzsa", "Bundás", "Fülöp", "Dió", "Makk", "Csoki", "Berci",
  "Pötyi", "Tappancs", "Szikra", "Manó", "Bogár", "Cirmi", "Göndör",
  "Pajkos", "Ráró", "Süni", "Topsi", "Virgonc", "Rex", "Max", "Brutus",
  "Cézár", "Herkules", "Ajax", "Zeus", "Pluto", "Hópehely", "Fekete",
  "Fehér", "Barna", "Szürke", "Tarka", "Cifra", "Bundó", "Marcó", "Laci",
  "Bojszi", "Kekó",
];

const CAT_NAMES = [
  "Cica", "Macska", "Mimi", "Cirmi", "Tündér", "Holdas", "Éjfél",
  "Narancs", "Hópehely", "Tigris", "Lázár", "Selymes", "Bolyhos",
  "Párducka", "Szürke", "Fekete", "Fehérke", "Foltos", "Csíkos", "Kalapos",
  "Léna", "Luna", "Stella", "Nóra", "Bella", "Lili", "Maca", "Tündike",
  "Samu", "Gömböc",
];

const OTHER_NAMES = [
  "Füles", "Ugrándozó", "Pöttyös", "Gyöngyös", "Szivárvány",
  "Kis Szív", "Bolyhos", "Puha", "Csendes", "Élénk",
  "Pihe", "Gubó", "Pelyhes", "Csipke", "Dundi",
];

const DOG_BREEDS = [
  "Keverék", "Labrador", "Német juhász", "Beagle", "Golden Retriever",
  "Husky", "Rottweiler", "Puli", "Vizsla", "Mudi", "Pumi",
  "Magyar Agár", "Erdélyi Kopó", "Bernáthegyi", "Boxer",
  "Dobermann", "Dalmata", "Spániel", "Poodle", "Schnauzer",
];

const CAT_BREEDS = [
  "Keverék", "Európai rövidszőrű", "Maine Coon", "Perzsa", "Sziámi",
  "Brit rövidszőrű", "Ragdoll", "Bengal", "Norvég erdei", "Abyssinian",
];

const RABBIT_BREEDS = ["Keverék", "Holland törpe", "Angora", "Rex", "Közönséges nyúl"];
const BIRD_BREEDS   = ["Keverék", "Hullámos papagáj", "Nimfa", "Kakadu", "Afrikai szürke"];

const ANIMAL_DESCRIPTIONS = [
  "Kedves, játékos {name} szerető gazdira vár! Gyerekekkel és más állatokkal is jól kijön.",
  "{name} egy igazi csodaállat – engedelmes, tanulékony, és imádja az emberek társaságát.",
  "Menhely életéhez képest {name} nagyon kiegyensúlyozott. Türelmes, szeretne végre otthont kapni.",
  "{name} az egyik leghűségesebb lakónk. Minden nap reméli, hogy megtalálja új gazdáját.",
  "Szelíd és csendes természetű, {name} ideális lakótársa lenne egy nyugodt háztartásnak.",
  "{name} imádja a sétákat, a játékot, és persze a cicózásokat. Rengeteg szeretetet ad vissza!",
  "{name} fiatal és energikus, de könnyen tanul. Olyan gazdira vár, aki szeret aktívan tölteni az idejét.",
  "Az öreg {name} is megérdemli a szeretetet. Csendes, háladatos és nagyon ragaszkodó.",
  "{name} sajnos menhelyen nőtt fel, de nem vesztette el az emberekbe vetett hitét.",
  "Ha van kerted, {name} a legjobb választás! Szeret a szabadban szaladgálni és játszani.",
  "{name} imád simogatást kapni, és órákon át el tud üldögélni az ölben. Igazi öléb!",
  "{name} kicsit félénk eleinte, de hamar megnyílik. Türelmes gazdira van szüksége.",
];

const COLORS = ["fekete", "fehér", "barna", "szürke", "tarka", "arany", "vörös", "tricolor", "krém"];

const IMG_KEYWORDS: Record<AnimalType, string> = {
  DOG:    "dog",
  CAT:    "cat",
  RABBIT: "rabbit",
  BIRD:   "parrot",
  OTHER:  "hamster",
};

function imgUrl(type: AnimalType, seed: number) {
  return `https://loremflickr.com/640/480/${IMG_KEYWORDS[type]}?lock=${seed}`;
}

// ── Main ──────────────────────────────────────────────

async function main() {
  console.log("🌱 Nagy seed indítása...");
  console.log(`   Menhelyek: ${NUM_SHELTERS} | Felhasználók: ${NUM_USERS}`);

  // ── 0. DWH törlése (opcionális) ──────────────────
  if (process.env.dwh_POSTGRES_PRISMA_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PrismaClient: DwhClient } = require("../lib/generated/dwh-client");
      const dwhDb = new DwhClient();
      await dwhDb.factAdoption.deleteMany({});
      await dwhDb.factAnimalInventory.deleteMany({});
      await dwhDb.dimAnimal.deleteMany({});
      await dwhDb.dimDate.deleteMany({});
      await dwhDb.dimUser.deleteMany({});
      await dwhDb.dimShelter.deleteMany({});
      await dwhDb.$disconnect();
      console.log("✅ DWH adatok törölve");
    } catch {
      console.log("⚠️  DWH nem elérhető – kihagyva");
    }
  }

  // ── 1. OLTP törlése (FK-sorrend) ─────────────────
  console.log("🗑️  OLTP adatok törlése...");
  await prisma.donation.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.donationTier.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.adoptionApplication.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.animalReport.deleteMany({});
  await prisma.animalImage.deleteMany({});
  await prisma.animalDocument.deleteMany({});
  await prisma.animal.deleteMany({});
  await prisma.shelterAdmin.deleteMany({});
  await prisma.shelterDocument.deleteMany({});
  await prisma.shelter.deleteMany({});
  await prisma.passwordResetToken.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.verificationToken.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✅ Minden adat törölve\n");

  // ── 2. Jelszavak hashelése ────────────────────────
  const adminPw = await hash("Admin1234!", 10);
  const userPw  = await hash("User1234!",  10);

  // ── 3. Superadmin ─────────────────────────────────
  await prisma.user.create({
    data: {
      name:          "Rendszergazda",
      email:         "admin@menhely.hu",
      password:      adminPw,
      role:          Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Superadmin: admin@menhely.hu");

  // ── 4. Demo felhasználók ──────────────────────────
  await prisma.user.createMany({
    data: Array.from({ length: NUM_USERS }, (_, i) => ({
      name:          `Teszt Felhasználó ${i + 1}`,
      email:         `user${i + 1}@example.com`,
      password:      userPw,
      role:          Role.USER,
      emailVerified: new Date(),
      phone:         `+3630${rndInt(1000000, 9999999)}`,
      city:          rnd(CITIES).name,
      country:       "HU",
    })),
    skipDuplicates: true,
  });
  const demoUsers = await prisma.user.findMany({
    where:  { role: Role.USER },
    select: { id: true },
  });
  console.log(`✅ ${demoUsers.length} demo felhasználó`);

  // ── 5. Menhely admin felhasználók ─────────────────
  const shelterAdminEmails = Array.from(
    { length: NUM_SHELTERS },
    (_, i) => `shelteradmin${i + 1}@allatimenhelyek.hu`,
  );
  await prisma.user.createMany({
    data: shelterAdminEmails.map((email, i) => ({
      name:          `${SHELTER_NAMES[i]} – Admin`,
      email,
      password:      adminPw,
      role:          Role.SHELTER_ADMIN,
      emailVerified: new Date(),
    })),
    skipDuplicates: true,
  });
  const shelterAdminUsers = await prisma.user.findMany({
    where:  { email: { in: shelterAdminEmails } },
    select: { id: true, email: true },
  });
  const adminIdByEmail: Record<string, string> = Object.fromEntries(
    shelterAdminUsers.map(u => [u.email, u.id]),
  );
  console.log(`✅ ${shelterAdminUsers.length} menhely-admin felhasználó`);

  // ── 6. Menhelyek ──────────────────────────────────
  const shelterRows = SHELTER_NAMES.map((name, i) => {
    const city = CITIES[i % CITIES.length];
    const slug = `${slugify(name)}-${i + 1}`;
    return {
      name,
      slug,
      description: `${name} ${city.name}ban működő, nonprofit állatvédő szervezet. ` +
        `Célunk a bajba jutott állatok megmentése és új, szerető otthonba juttatása.`,
      address:     `Állatvédő utca ${rndInt(1, 99)}.`,
      city:        city.name,
      zipCode:     String(city.zip),
      country:     "HU",
      phone:       `+3630${rndInt(1000000, 9999999)}`,
      email:       `info@${slugify(name)}-${i + 1}.hu`,
      website:     `https://${slugify(name)}-${i + 1}.hu`,
      isVerified:  rndBool(0.6),
      isActive:    true,
    };
  });

  await prisma.shelter.createMany({ data: shelterRows, skipDuplicates: true });

  const shelters = await prisma.shelter.findMany({
    where:  { slug: { in: shelterRows.map(s => s.slug) } },
    select: { id: true, slug: true },
  });
  const shelterIdBySlug: Record<string, string> = Object.fromEntries(
    shelters.map(s => [s.slug, s.id]),
  );

  // Map shelterId → admin email (same index order as shelterRows)
  const shelterIdToAdminEmail: Record<string, string> = {};
  for (let i = 0; i < shelterRows.length; i++) {
    const sid = shelterIdBySlug[shelterRows[i].slug];
    if (sid) shelterIdToAdminEmail[sid] = shelterAdminEmails[i];
  }
  console.log(`✅ ${shelters.length} menhely`);

  // ── 7. ShelterAdmin kapcsolatok ───────────────────
  await prisma.shelterAdmin.createMany({
    data: shelterRows
      .map((sr, i) => ({
        userId:    adminIdByEmail[shelterAdminEmails[i]],
        shelterId: shelterIdBySlug[sr.slug],
      }))
      .filter(r => r.userId && r.shelterId),
    skipDuplicates: true,
  });
  console.log("✅ ShelterAdmin kapcsolatok");

  // ── 8. Állatok ────────────────────────────────────
  console.log("\n📦 Állatok generálása...");

  type AnimalRow = {
    shelterId:      string;
    name:           string;
    slug:           string;
    type:           AnimalType;
    breed:          string | null;
    age:            number;
    size:           AnimalSize;
    gender:         string;
    color:          string;
    weight:         number;
    description:    string;
    isVaccinated:   boolean;
    isNeutered:     boolean;
    isMicrochipped: boolean;
    isGoodWithKids: boolean;
    isGoodWithDogs: boolean;
    isGoodWithCats: boolean;
    status:         AnimalStatus;
    arrivedAt:      Date;
    adoptedAt:      Date | null;
  };

  const STATUS_POOL: AnimalStatus[] = [
    AnimalStatus.AVAILABLE,
    AnimalStatus.AVAILABLE,
    AnimalStatus.AVAILABLE,
    AnimalStatus.PENDING,
    AnimalStatus.ADOPTED,
    AnimalStatus.FOSTER,
    AnimalStatus.MEDICAL_HOLD,
  ];

  const animalRows: AnimalRow[] = [];

  for (const shelter of shelters) {
    const count = rndInt(8, 20);
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      const type: AnimalType =
        roll < 0.55 ? AnimalType.DOG    :
        roll < 0.82 ? AnimalType.CAT    :
        roll < 0.90 ? AnimalType.RABBIT :
        roll < 0.95 ? AnimalType.BIRD   :
                      AnimalType.OTHER;

      const namePool  = type === AnimalType.DOG ? DOG_NAMES : type === AnimalType.CAT ? CAT_NAMES : OTHER_NAMES;
      const breedPool = type === AnimalType.DOG    ? DOG_BREEDS    :
                        type === AnimalType.CAT    ? CAT_BREEDS    :
                        type === AnimalType.RABBIT ? RABBIT_BREEDS :
                        type === AnimalType.BIRD   ? BIRD_BREEDS   : null;

      const name      = rnd(namePool);
      const slug      = `${slugify(name)}-${shelter.id.slice(-5)}-${i}`;
      const status    = rnd(STATUS_POOL);
      const arrivedAt = new Date(Date.now() - rndInt(7, 730) * 86_400_000);

      animalRows.push({
        shelterId:      shelter.id,
        name,
        slug,
        type,
        breed:          breedPool ? rnd(breedPool) : null,
        age:            rndInt(2, 144),
        size:           rnd([AnimalSize.SMALL, AnimalSize.MEDIUM, AnimalSize.LARGE, AnimalSize.EXTRA_LARGE]),
        gender:         rnd(["MALE", "FEMALE"]),
        color:          rnd(COLORS),
        weight:         parseFloat((rndInt(1, 45) + Math.random()).toFixed(1)),
        description:    rnd(ANIMAL_DESCRIPTIONS).replace(/{name}/g, name),
        isVaccinated:   rndBool(0.75),
        isNeutered:     rndBool(0.6),
        isMicrochipped: rndBool(0.7),
        isGoodWithKids: rndBool(0.65),
        isGoodWithDogs: rndBool(0.6),
        isGoodWithCats: rndBool(0.5),
        status,
        arrivedAt,
        adoptedAt: status === AnimalStatus.ADOPTED
          ? new Date(arrivedAt.getTime() + rndInt(14, 180) * 86_400_000)
          : null,
      });
    }
  }

  for (let i = 0; i < animalRows.length; i += BATCH) {
    await prisma.animal.createMany({ data: animalRows.slice(i, i + BATCH), skipDuplicates: true });
  }
  console.log(`✅ ${animalRows.length} állat`);

  // ── 9. Állat képek ────────────────────────────────
  const allAnimals = await prisma.animal.findMany({
    where:  { shelterId: { in: shelters.map(s => s.id) } },
    select: { id: true, type: true },
  });

  const imageRows = allAnimals.map((a, idx) => ({
    animalId:  a.id,
    url:       imgUrl(a.type as AnimalType, idx),
    alt:       "Állat fotó",
    isPrimary: true,
    order:     0,
  }));

  for (let i = 0; i < imageRows.length; i += BATCH) {
    await prisma.animalImage.createMany({ data: imageRows.slice(i, i + BATCH), skipDuplicates: true });
  }
  console.log(`✅ ${imageRows.length} állat-kép`);

  // ── 10. Örökbefogadási kérelmek ───────────────────
  const adoptableAnimals = await prisma.animal.findMany({
    where:  { status: { in: [AnimalStatus.PENDING, AnimalStatus.ADOPTED] } },
    select: { id: true, status: true, arrivedAt: true, adoptedAt: true },
    take:   600,
  });

  const seenPairs = new Set<string>();
  const appRows: {
    userId:      string;
    animalId:    string;
    status:      ApplicationStatus;
    message:     string;
    homeType:    string;
    hasGarden:   boolean;
    hasChildren: boolean;
    hasPets:     boolean;
    experience:  string;
    createdAt:   Date;
    reviewedAt:  Date | null;
  }[] = [];

  const now = Date.now();

  for (const animal of adoptableAnimals) {
    const user = rnd(demoUsers);
    const pair = `${user.id}:${animal.id}`;
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);

    const isApproved = animal.status === AnimalStatus.ADOPTED;

    // Az örökbefogadás (reviewedAt) az állat tényleges adoptedAt-jéhez igazodik,
    // így a FactAdoption dátumai ~24 hónapra szétszóródnak. A kérelem (createdAt)
    // néhány nappal a jóváhagyás előtt keletkezik. PENDING esetben friss kérelem.
    let createdAt: Date;
    let reviewedAt: Date | null;

    if (isApproved && animal.adoptedAt) {
      const adopted = Math.min(animal.adoptedAt.getTime(), now); // nem a jövőben
      reviewedAt = new Date(adopted);
      createdAt  = new Date(adopted - rndInt(1, 21) * 86_400_000);
      // a kérelem ne legyen korábbi, mint az állat érkezése
      if (animal.arrivedAt && createdAt < animal.arrivedAt) createdAt = new Date(animal.arrivedAt.getTime());
    } else {
      reviewedAt = null;
      createdAt  = new Date(now - rndInt(1, 90) * 86_400_000);
    }

    appRows.push({
      userId:      user.id,
      animalId:    animal.id,
      status:      isApproved ? ApplicationStatus.APPROVED : ApplicationStatus.PENDING,
      message:     "Szeretném örökbefogadni ezt az állatot. Biztonságos, szerető otthont tudok nyújtani.",
      homeType:    rnd(["HOUSE", "APARTMENT", "OTHER"]),
      hasGarden:   rndBool(0.5),
      hasChildren: rndBool(0.4),
      hasPets:     rndBool(0.3),
      experience:  "Volt már állatom, szívesen vállalom a gondozást.",
      createdAt,
      reviewedAt,
    });
  }

  await prisma.adoptionApplication.createMany({ data: appRows, skipDuplicates: true });
  console.log(`✅ ${appRows.length} örökbefogadási kérelem`);

  // ── 11. Adományozási szintek ──────────────────────
  const TIER_TEMPLATES = [
    { name: "Alapcsomag", amount: 1000,  desc: "Havi 1 000 Ft-os támogatás – köszönjük!" },
    { name: "Barát",      amount: 2500,  desc: "Havi 2 500 Ft-tal egy állat ellátásához járulsz hozzá." },
    { name: "Védnök",     amount: 5000,  desc: "Havi 5 000 Ft-os védnökség – neveddel hirdethető!" },
    { name: "Nagylelkű",  amount: 10000, desc: "Havi 10 000 Ft – igazi mentőangyal vagy!" },
  ];

  const tierRows: {
    shelterId:   string;
    name:        string;
    description: string;
    amount:      number;
    isActive:    boolean;
  }[] = [];

  for (const shelter of shelters) {
    if (!rndBool(0.6)) continue;
    const tierCount = rndInt(1, 4);
    for (let t = 0; t < tierCount; t++) {
      const tmpl = TIER_TEMPLATES[t];
      tierRows.push({
        shelterId:   shelter.id,
        name:        tmpl.name,
        description: tmpl.desc,
        amount:      tmpl.amount,
        isActive:    true,
      });
    }
  }

  await prisma.donationTier.createMany({ data: tierRows, skipDuplicates: true });
  console.log(`✅ ${tierRows.length} adományozási szint`);

  // ── 12. Kampányok ─────────────────────────────────
  const CAMPAIGN_TITLES = [
    "Téli takarmány összefogás",
    "Új kennel építése",
    "Állatorvosi kezelések finanszírozása",
    "Menhelybővítési kampány",
    "Nyári oltási program",
    "Sterilizálási alap",
    "Sérült állatok gyógyítása",
    "Öreg állatok otthona",
    "Katasztrófa-segély állatvédelem",
    "Mozgáskorlátozottak menhelye",
    "Kutyás terápia program",
    "Macskamentő akció",
  ];

  const campaignRows: {
    userId:       string;
    shelterId:    string;
    title:        string;
    slug:         string;
    description:  string;
    targetAmount: number;
    raisedAmount: number;
    status:       CampaignStatus;
    endsAt:       Date;
  }[] = [];

  let campIdx = 0;
  for (const shelter of shelters) {
    if (!rndBool(0.28)) continue;
    const adminEmail = shelterIdToAdminEmail[shelter.id];
    const adminId    = adminEmail ? adminIdByEmail[adminEmail] : null;
    if (!adminId) continue;

    const title = CAMPAIGN_TITLES[campIdx % CAMPAIGN_TITLES.length];
    const slug  = `${slugify(title)}-${shelter.id.slice(-4)}-${campIdx}`;

    campaignRows.push({
      userId:       adminId,
      shelterId:    shelter.id,
      title,
      slug,
      description:  `${title} – ${shelter.slug} menhely szervezi ezt a fontos kampányt az állatok jólétéért.`,
      targetAmount: rndInt(100_000, 2_000_000),
      raisedAmount: rndInt(0, 500_000),
      status:       rnd([
        CampaignStatus.ACTIVE,
        CampaignStatus.ACTIVE,
        CampaignStatus.ACTIVE,
        CampaignStatus.COMPLETED,
        CampaignStatus.PENDING,
      ]),
      endsAt: new Date(Date.now() + rndInt(30, 365) * 86_400_000),
    });
    campIdx++;
  }

  await prisma.campaign.createMany({ data: campaignRows, skipDuplicates: true });
  console.log(`✅ ${campaignRows.length} kampány`);

  // ── 13. Bejelentések ──────────────────────────────
  const reportRows = Array.from({ length: 300 }, (_, i) => {
    const type       = rnd([ReportType.LOST, ReportType.LOST, ReportType.FOUND, ReportType.STRAY]);
    const animalType = rnd([AnimalType.DOG, AnimalType.DOG, AnimalType.CAT, AnimalType.OTHER]);
    const city       = rnd(CITIES);
    const user       = rndBool(0.65) ? rnd(demoUsers) : null;
    return {
      userId:       user?.id ?? null,
      type,
      animalType,
      name:         type === ReportType.LOST ? rnd(DOG_NAMES) : null,
      breed:        rndBool(0.55)
                      ? rnd(animalType === AnimalType.DOG ? DOG_BREEDS : CAT_BREEDS)
                      : null,
      color:        rnd(COLORS),
      gender:       rnd(["MALE", "FEMALE", "UNKNOWN"]),
      description:  `${
        type === ReportType.LOST   ? "Elveszett" :
        type === ReportType.FOUND  ? "Megtalált" : "Kóbor"
      } állat ${city.name} körzetében.`,
      city:         city.name,
      address:      `Minta utca ${rndInt(1, 99)}.`,
      contactName:  `Bejelentő ${i + 1}`,
      contactPhone: `+3620${rndInt(1000000, 9999999)}`,
      contactEmail: `bejelento${i + 1}@example.com`,
      status:       rnd([ReportStatus.ACTIVE, ReportStatus.ACTIVE, ReportStatus.RESOLVED]),
    };
  });

  await prisma.animalReport.createMany({ data: reportRows, skipDuplicates: true });
  console.log(`✅ ${reportRows.length} bejelentés`);

  // ── 14. Egészségügyi bejegyzések ──────────────────────────────────────────
  console.log("\n🏥 Egészségügyi bejegyzések...");
  const HR_TYPE_POOL: HealthRecordType[] = [
    HealthRecordType.VACCINATION, HealthRecordType.VACCINATION,
    HealthRecordType.DEWORMING,   HealthRecordType.CHECKUP,
    HealthRecordType.TREATMENT,   HealthRecordType.VET_VISIT,
  ];
  const HR_TITLES: Record<HealthRecordType, string> = {
    VACCINATION: "Védőoltás",   DEWORMING: "Féregtelenítés",
    CHECKUP: "Szűrővizsgálat", TREATMENT: "Kezelés",
    VET_VISIT: "Állatorvosi vizit", SURGERY: "Műtét",
  };
  const VET_NAMES = ["Dr. Nagy Péter", "Dr. Kiss Anna", "Dr. Szabó Gábor", "Dr. Varga Éva", "Dr. Molnár Zoltán"];
  const hrRows = allAnimals.slice(0, 1200).map(a => {
    const type = rnd(HR_TYPE_POOL);
    const date = new Date(Date.now() - rndInt(1, 365) * 86_400_000);
    return {
      animalId: a.id, type, title: HR_TITLES[type],
      description: `${HR_TITLES[type]} sikeresen elvégezve.`,
      date,
      nextDueDate: (type === HealthRecordType.VACCINATION || type === HealthRecordType.DEWORMING)
        ? new Date(date.getTime() + 365 * 86_400_000) : null,
      vetName: rnd(VET_NAMES),
    };
  });
  for (let i = 0; i < hrRows.length; i += BATCH) await prisma.healthRecord.createMany({ data: hrRows.slice(i, i + BATCH) });
  console.log(`✅ ${hrRows.length} egészségügyi bejegyzés`);

  // ── 15. Értékelések (user → menhely) ──────────────────────────────────────
  const REVIEW_COMMENTS_POOL = [
    "Kiváló menhely, nagyon segítőkész személyzet!", null,
    "Tiszta, rendezett hely, gondozott állatok.", null,
    "Az örökbefogadási folyamat átlátható és gyors volt.",
    "Kedves csapat, szívesen ajánlom mindenkinek.",
    "Kicsit lassú volt a válasz, de végül minden rendben lett.",
    "Profi szervezet, megbízható és gondoskodó.",
    "Minden kérdésemre válaszoltak, elégedett vagyok.",
  ];
  const reviewPairsSeen = new Set<string>();
  const reviewRows: { authorId: string; shelterId: string; rating: number; comment: string | null }[] = [];
  for (let i = 0; reviewRows.length < 300 && i < 800; i++) {
    const user    = rnd(demoUsers);
    const shelter = rnd(shelters.slice(0, 120));
    const key     = `${user.id}:${shelter.id}`;
    if (reviewPairsSeen.has(key)) continue;
    reviewPairsSeen.add(key);
    reviewRows.push({ authorId: user.id, shelterId: shelter.id, rating: rnd([3, 4, 4, 5, 5, 5]), comment: rnd(REVIEW_COMMENTS_POOL) });
  }
  await prisma.review.createMany({ data: reviewRows, skipDuplicates: true });
  console.log(`✅ ${reviewRows.length} értékelés`);

  // ── 16. Önkéntesek ────────────────────────────────────────────────────────
  const VOL_MOTIVATIONS = [
    "Szeretek állatokkal foglalkozni, és így hasznosan töltöm a szabad időmet.",
    "Az állatvédelem közel áll a szívemhez – segíteni szeretnék.",
    "Korábbi állatmentési tapasztalataim vannak.",
    "Fotós vagyok, az állatokról szívesen készítek minőségi képeket.",
  ];
  const VOL_SKILLS = ["Sétáltatás, szocializáció", "Fotózás, közösségi média", "Adminisztráció", "Állatorvosi asszisztencia"];
  const VOL_AVAIL  = ["Hétvégente", "Hétköznap este", "Rugalmas", "Szombat délelőtt"];
  const volPairsSeen = new Set<string>();
  const volRows: { userId: string; shelterId: string; status: VolunteerStatus; motivation: string; skills: string; availability: string }[] = [];
  for (const vShelter of shelters.slice(0, 80)) {
    for (let i = 0; i < rndInt(2, 4); i++) {
      const user = rnd(demoUsers);
      const key  = `${user.id}:${vShelter.id}`;
      if (volPairsSeen.has(key)) continue;
      volPairsSeen.add(key);
      volRows.push({ userId: user.id, shelterId: vShelter.id, status: rnd([VolunteerStatus.ACTIVE, VolunteerStatus.ACTIVE, VolunteerStatus.PENDING]), motivation: rnd(VOL_MOTIVATIONS), skills: rnd(VOL_SKILLS), availability: rnd(VOL_AVAIL) });
    }
  }
  await prisma.volunteer.createMany({ data: volRows, skipDuplicates: true });
  const createdVols = await prisma.volunteer.findMany({ where: { shelterId: { in: shelters.slice(0, 80).map(s => s.id) } }, select: { id: true, status: true } });
  const attRows: { volunteerId: string; date: Date; hours: number; note: string | null }[] =
    createdVols.filter(v => v.status === VolunteerStatus.ACTIVE).flatMap(v => ([
      { volunteerId: v.id, date: new Date(Date.now() - rndInt(1, 30)  * 86_400_000), hours: rndInt(2, 5), note: rndBool(0.6) ? rnd(["Sétáltatás", "Takarítás", "Etetés", "Fotózás"]) : null },
      { volunteerId: v.id, date: new Date(Date.now() - rndInt(31, 60) * 86_400_000), hours: rndInt(2, 4), note: rndBool(0.4) ? rnd(["Sétáltatás", "Takarítás"]) : null },
    ]));
  for (let i = 0; i < attRows.length; i += BATCH) await prisma.volunteerAttendance.createMany({ data: attRows.slice(i, i + BATCH) });
  console.log(`✅ ${volRows.length} önkéntes + ${attRows.length} jelenlét`);

  // ── 17. Önkéntes feladatok ────────────────────────────────────────────────
  const TASK_TITLES_LIST = [
    "Hétvégi sétáltatás", "Menhelynyitva tartás segítése",
    "Örökbefogadási vásár", "Fotózás az állatokról",
    "Kennel takarítás", "Szocializációs foglalkozás",
    "Állatszállítás segítése", "Adománygyűjtő akció",
  ];
  const taskRows = shelters.slice(0, 50).flatMap(s =>
    Array.from({ length: rndInt(1, 2) }, (_, j) => ({
      shelterId:     s.id,
      title:         TASK_TITLES_LIST[(j * 3) % TASK_TITLES_LIST.length],
      description:   "Önkéntes segítség szükséges ehhez a feladathoz.",
      scheduledAt:   new Date(Date.now() + rndInt(3, 60) * 86_400_000),
      maxVolunteers: rndInt(2, 5),
    }))
  );
  await prisma.volunteerTask.createMany({ data: taskRows });
  console.log(`✅ ${taskRows.length} önkéntes feladat`);

  // ── 18. Időpontfoglalások ─────────────────────────────────────────────────
  const aptRows: { shelterId: string; userId: string; animalId: string | null; status: AppointmentStatus; proposedAt: Date; confirmedAt: Date | null; note: string | null; adminNote: string | null; cancelledBy: string | null }[] = [];
  for (let i = 0; i < 200; i++) {
    const shelter  = rnd(shelters.slice(0, 80));
    const user     = rnd(demoUsers);
    const animal   = rndBool(0.65) ? rnd(allAnimals) : null;
    const proposed = new Date(Date.now() + rndInt(-14, 45) * 86_400_000);
    const status   = rnd([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]);
    aptRows.push({ shelterId: shelter.id, userId: user.id, animalId: animal?.id ?? null, status, proposedAt: proposed, confirmedAt: (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.COMPLETED) ? proposed : null, note: rndBool(0.7) ? "Személyesen szeretném megismerni az állatot." : null, adminNote: status === AppointmentStatus.CONFIRMED ? "Visszaigazolva, várjuk!" : null, cancelledBy: status === AppointmentStatus.CANCELLED ? rnd(["USER", "ADMIN"]) : null });
  }
  for (let i = 0; i < aptRows.length; i += BATCH) await prisma.appointment.createMany({ data: aptRows.slice(i, i + BATCH) });
  console.log(`✅ ${aptRows.length} időpontfoglalás`);

  // ── 19. Utánkövetések ─────────────────────────────────────────────────────
  const approvedApps = await prisma.adoptionApplication.findMany({ where: { status: ApplicationStatus.APPROVED }, select: { id: true, reviewedAt: true } });
  const fuRows = approvedApps.flatMap(app => {
    const base = (app.reviewedAt ?? new Date()).getTime();
    return [
      { applicationId: app.id, scheduledAt: new Date(base + 30 * 86_400_000), completedAt: rndBool(0.65) ? new Date(base + 30 * 86_400_000) : null as Date | null, wellbeing: rndBool(0.65) ? rnd([3, 4, 4, 5, 5]) : null as number | null, notes: rndBool(0.5) ? "Az állat szépen beilleszkedett az új otthonba." : null as string | null, status: rndBool(0.65) ? FollowUpStatus.COMPLETED : FollowUpStatus.PENDING },
      { applicationId: app.id, scheduledAt: new Date(base + 90 * 86_400_000), completedAt: null as Date | null, wellbeing: null as number | null, notes: null as string | null, status: new Date(base + 90 * 86_400_000) < new Date() ? FollowUpStatus.OVERDUE : FollowUpStatus.PENDING },
    ];
  });
  for (let i = 0; i < fuRows.length; i += BATCH) await prisma.adoptionFollowUp.createMany({ data: fuRows.slice(i, i + BATCH) });
  console.log(`✅ ${fuRows.length} utánkövetés (${approvedApps.length} jóváhagyott kérelemhez)`);

  // ── 20. Készlettételek ────────────────────────────────────────────────────
  console.log("\n📦 Készlet generálása...");
  const INV_TEMPLATES = [
    { name: "Royal Canin Adult",     cat: InventoryCategory.FOOD,      unit: "kg",       qty: 50, min: 10 },
    { name: "Kölyöktáp",             cat: InventoryCategory.FOOD,      unit: "kg",       qty: 20, min: 5  },
    { name: "Macska alapétel",       cat: InventoryCategory.FOOD,      unit: "kg",       qty: 15, min: 5  },
    { name: "Antibiotikum tabletta", cat: InventoryCategory.MEDICINE,  unit: "tabletta", qty: 30, min: 20 },
    { name: "Féregtelenítő",         cat: InventoryCategory.MEDICINE,  unit: "tabletta", qty: 40, min: 15 },
    { name: "Fertőtlenítő spray",    cat: InventoryCategory.CLEANING,  unit: "liter",    qty: 8,  min: 3  },
    { name: "Mosószer",              cat: InventoryCategory.CLEANING,  unit: "kg",       qty: 5          },
    { name: "Póráz (vegyes méret)",  cat: InventoryCategory.SUPPLIES,  unit: "db",       qty: 20         },
    { name: "Macska homok",          cat: InventoryCategory.SUPPLIES,  unit: "kg",       qty: 50, min: 10 },
    { name: "Kutyaágy",              cat: InventoryCategory.EQUIPMENT, unit: "db",       qty: 15         },
  ];
  const invItemRows: { shelterId: string; name: string; category: InventoryCategory; unit: string; quantity: number; minQuantity: number | null }[] = [];
  for (const invS of shelters.slice(0, 100)) {
    const picked = [...INV_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, rndInt(3, 5));
    for (const t of picked) {
      const rawQty = rndBool(0.15) && t.min ? Math.max(0, t.min - rndInt(1, t.min)) : t.qty + rndInt(-10, 15);
      invItemRows.push({ shelterId: invS.id, name: t.name, category: t.cat, unit: t.unit, quantity: Math.max(0, rawQty), minQuantity: t.min ?? null });
    }
  }
  await prisma.inventoryItem.createMany({ data: invItemRows });
  const createdInvItems = await prisma.inventoryItem.findMany({ where: { shelterId: { in: shelters.slice(0, 100).map(s => s.id) } }, select: { id: true, quantity: true } });
  const openingTxRows = createdInvItems.filter(i => i.quantity > 0).map(i => ({ itemId: i.id, type: InventoryTxType.IN, quantity: Number(i.quantity), note: "Nyitókészlet" }));
  for (let i = 0; i < openingTxRows.length; i += BATCH) await prisma.inventoryTransaction.createMany({ data: openingTxRows.slice(i, i + BATCH) });
  console.log(`✅ ${invItemRows.length} készlettétel + ${openingTxRows.length} nyitótranzakció`);

  // ── 21. Előfizetések ──────────────────────────────────────────────────────
  const allTiers = await prisma.donationTier.findMany({ select: { id: true } });
  if (allTiers.length > 0) {
    const subPairsSeen = new Set<string>();
    const subRows: { userId: string; tierId: string }[] = [];
    for (let i = 0; subRows.length < 60 && i < 300; i++) {
      const user = rnd(demoUsers);
      const tier = rnd(allTiers);
      const key  = `${user.id}:${tier.id}`;
      if (subPairsSeen.has(key)) continue;
      subPairsSeen.add(key);
      subRows.push({ userId: user.id, tierId: tier.id });
    }
    await prisma.subscription.createMany({ data: subRows, skipDuplicates: true });
    console.log(`✅ ${subRows.length} előfizetés`);
  }

  // ── 22. Adományok ─────────────────────────────────────────────────────────
  const activeCampaigns = await prisma.campaign.findMany({ where: { status: CampaignStatus.ACTIVE }, select: { id: true }, take: 50 });
  if (activeCampaigns.length > 0) {
    const AMOUNTS = [500, 1000, 2500, 5000, 10000, 20000];
    const donRows = Array.from({ length: 120 }, () => ({ userId: rndBool(0.8) ? rnd(demoUsers).id : null, campaignId: rnd(activeCampaigns).id, amount: rnd(AMOUNTS), isAnonymous: rndBool(0.2), paidAt: new Date(Date.now() - rndInt(1, 180) * 86_400_000) }));
    await prisma.donation.createMany({ data: donRows });
    console.log(`✅ ${donRows.length} adomány`);
  }

  // ── 23. Üzenetek és beszélgetések ─────────────────────────────────────────
  console.log("\n💬 Üzenetek generálása...");
  const convAnimals = await prisma.animal.findMany({ where: { shelterId: { in: shelters.slice(0, 50).map(s => s.id) } }, select: { id: true, shelterId: true }, take: 100 });
  const convPairsSeen = new Set<string>();
  const convRows: { animalId: string; userId: string; shelterId: string }[] = [];
  for (const ca of convAnimals) {
    const user = rnd(demoUsers);
    const key  = `${ca.id}:${user.id}`;
    if (convPairsSeen.has(key)) continue;
    convPairsSeen.add(key);
    convRows.push({ animalId: ca.id, userId: user.id, shelterId: ca.shelterId });
  }
  await prisma.conversation.createMany({ data: convRows, skipDuplicates: true });
  const createdConvs = await prisma.conversation.findMany({ where: { animalId: { in: convRows.map(c => c.animalId) } }, select: { id: true, userId: true, shelterId: true } });
  const MSG_USER  = ["Érdeklődöm az állat iránt – mikor lehet megnézni?", "Van-e lehetőség hétvégén látogatást szervezni?", "Örökbefogadható még az állat?"];
  const MSG_ADMIN = ["Persze, szívesen fogadjuk! Kérem hívjon: +36301234567.", "Hétvégén 10-12 között foglalkozunk látogatókkal.", "Az állat jó egészségnek örvend."];
  const msgRows: { conversationId: string; senderId: string; content: string; readAt: Date | null }[] = [];
  for (const conv of createdConvs) {
    const adminEmail  = shelterIdToAdminEmail[conv.shelterId];
    const adminUserId = adminEmail ? adminIdByEmail[adminEmail] : null;
    if (!adminUserId) continue;
    msgRows.push(
      { conversationId: conv.id, senderId: conv.userId, content: rnd(MSG_USER),  readAt: new Date() },
      { conversationId: conv.id, senderId: adminUserId, content: rnd(MSG_ADMIN), readAt: new Date() },
      { conversationId: conv.id, senderId: conv.userId, content: "Köszönöm a gyors választ!", readAt: null },
    );
  }
  for (let i = 0; i < msgRows.length; i += BATCH) await prisma.message.createMany({ data: msgRows.slice(i, i + BATCH) });
  console.log(`✅ ${convRows.length} beszélgetés + ${msgRows.length} üzenet`);

  // ── 24. Értesítések ───────────────────────────────────────────────────────
  const NOTIF_POOL = [
    { type: NotificationType.APPLICATION_APPROVED,  title: "Kérelmét jóváhagyták!",         body: "Örömmel értesítjük, hogy örökbefogadási kérelme elfogadásra került.",       href: "/applications" },
    { type: NotificationType.APPLICATION_REVIEWING, title: "Kérelme áttekintés alatt",       body: "Kérelme aktívan feldolgozás alatt van a menhely részéről.",                  href: "/applications" },
    { type: NotificationType.APPOINTMENT_CONFIRMED, title: "Időpontja visszaigazolva",       body: "A menhely megerősítette az időpontját.",                                      href: "/appointments" },
    { type: NotificationType.NEW_MESSAGE,           title: "Új üzenet érkezett",              body: "Új üzenete van a menhelytől.",                                               href: "/messages" },
    { type: NotificationType.FOLLOW_UP_DUE,         title: "Utánkövetési kérdőív esedékes", body: "Kérjük, töltse ki az örökbefogadás utáni kérdőívet.",                        href: "/followups" },
    { type: NotificationType.VOLUNTEER_APPROVED,    title: "Önkéntes kérelmét elfogadták",   body: "Sikeresen csatlakoztál az önkéntes csapathoz!",                              href: "/volunteers" },
    { type: NotificationType.INVENTORY_LOW_STOCK,   title: "Alacsony készletszint!",          body: "Egy vagy több készlettétel elérte a minimális szintet.",                     href: "/dashboard/inventory" },
  ];
  const notifRows: { userId: string; type: NotificationType; title: string; body: string; href: string | null; readAt: Date | null }[] = [];
  for (const user of demoUsers.slice(0, 50)) {
    for (let i = 0; i < rndInt(3, 6); i++) {
      const tmpl = rnd(NOTIF_POOL);
      notifRows.push({ userId: user.id, type: tmpl.type, title: tmpl.title, body: tmpl.body, href: tmpl.href, readAt: rndBool(0.55) ? new Date(Date.now() - rndInt(1, 30) * 86_400_000) : null });
    }
  }
  for (let i = 0; i < notifRows.length; i += BATCH) await prisma.notification.createMany({ data: notifRows.slice(i, i + BATCH) });
  console.log(`✅ ${notifRows.length} értesítés`);

  // ── Összefoglalás ─────────────────────────────────
  const [uCount, sCount, aCount] = await Promise.all([
    prisma.user.count(),
    prisma.shelter.count(),
    prisma.animal.count(),
  ]);
  console.log("\n🎉 Seed kész!");
  console.log(`   Felhasználók: ${uCount} | Menhelyek: ${sCount} | Állatok: ${aCount}`);
  console.log("   Superadmin:      admin@menhely.hu / Admin1234!");
  console.log("   Demo user:       user1@example.com / User1234!");
  console.log("   Menhely admin:   shelteradmin1@allatimenhelyek.hu / Admin1234!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
