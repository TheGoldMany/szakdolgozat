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
} from "@prisma/client";
import { hash } from "bcryptjs";

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
    select: { id: true, status: true },
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
  }[] = [];

  for (const animal of adoptableAnimals) {
    const user = rnd(demoUsers);
    const pair = `${user.id}:${animal.id}`;
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    appRows.push({
      userId:      user.id,
      animalId:    animal.id,
      status:      animal.status === AnimalStatus.ADOPTED
                     ? ApplicationStatus.APPROVED
                     : ApplicationStatus.PENDING,
      message:     "Szeretném örökbefogadni ezt az állatot. Biztonságos, szerető otthont tudok nyújtani.",
      homeType:    rnd(["HOUSE", "APARTMENT", "OTHER"]),
      hasGarden:   rndBool(0.5),
      hasChildren: rndBool(0.4),
      hasPets:     rndBool(0.3),
      experience:  "Volt már állatom, szívesen vállalom a gondozást.",
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
