import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import {
  AnimalType, AnimalSize, AnimalStatus, Role, ApplicationStatus,
  CampaignStatus, SubscriptionStatus, ReportType, ReportStatus,
  HealthRecordType, AppointmentStatus, VolunteerStatus,
  InventoryCategory, InventoryTxType, FollowUpStatus, NotificationType,
} from "@prisma/client";
import { seedNewModules } from "@/lib/seed-extras";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-seed-token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  // Accept either SUPER_ADMIN session or the secret token header
  const token = req.headers.get("x-seed-token");
  const tokenOk = process.env.SEED_SECRET && token === process.env.SEED_SECRET;

  if (!tokenOk) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
    }
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SEED_IN_PROD) {
    return NextResponse.json(
      { error: "Seeding disabled in production. Set ALLOW_SEED_IN_PROD=true to override." },
      { status: 403, headers: CORS }
    );
  }
  try {
    const result = await runSeed();
    return NextResponse.json({ success: true, ...result }, { headers: CORS });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed", detail: String(error) }, { status: 500, headers: CORS });
  }
}

// ─── Segédfüggvények ──────────────────────────────────────────────────────────

function ri<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rn(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rb(p = 0.5) { return Math.random() < p; }

const START = new Date("2025-01-01T00:00:00.000Z");
const NOW   = new Date();

function rndDate(from = START, to = NOW): Date {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()));
}

function seasonalDate(): Date {
  const d = rndDate();
  const m = d.getUTCMonth();
  if ((m >= 9 || m <= 1) && rb(0.4)) {
    const springStart = new Date(d.getUTCFullYear(), 2, 1);
    const springEnd   = new Date(d.getUTCFullYear(), 8, 30);
    if (springEnd > START && springEnd <= NOW) return rndDate(springStart, springEnd);
  }
  return d;
}

function slugify(text: string, suffix: string): string {
  return text.toLowerCase().normalize("NFD")
    .replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    + "-" + suffix;
}

// ─── Konstansok ───────────────────────────────────────────────────────────────

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Budapest",       lat: 47.497, lng: 19.040 },
  { name: "Debrecen",       lat: 47.531, lng: 21.626 },
  { name: "Miskolc",        lat: 48.103, lng: 20.779 },
  { name: "Pécs",           lat: 46.076, lng: 18.228 },
  { name: "Győr",           lat: 47.687, lng: 17.630 },
  { name: "Nyíregyháza",    lat: 47.955, lng: 21.717 },
  { name: "Kecskemét",      lat: 46.896, lng: 19.688 },
  { name: "Székesfehérvár", lat: 47.186, lng: 18.422 },
  { name: "Szombathely",    lat: 47.235, lng: 16.621 },
  { name: "Érd",            lat: 47.391, lng: 18.903 },
  { name: "Tatabánya",      lat: 47.586, lng: 18.395 },
  { name: "Kaposvár",       lat: 46.359, lng: 17.796 },
  { name: "Sopron",         lat: 47.685, lng: 16.591 },
  { name: "Eger",           lat: 47.902, lng: 20.377 },
  { name: "Veszprém",       lat: 47.093, lng: 17.908 },
  { name: "Zalaegerszeg",   lat: 46.840, lng: 16.840 },
  { name: "Szolnok",        lat: 47.176, lng: 20.181 },
  { name: "Nagykanizsa",    lat: 46.451, lng: 16.990 },
  { name: "Dunaújváros",    lat: 46.980, lng: 18.936 },
  { name: "Hódmezővásárhely", lat: 46.418, lng: 20.329 },
];

const SHELTER_NAMES = [
  "Mancs és Szív Állatvédők","Boldog Tappancs Menhely","Négy Láb Alapítvány",
  "Gazdira Vár Állatmenház","Állati Jó Hely","Hűséges Pata Menhely",
  "Szőrös Barátok Egyesület","Kapaszkodó Mancs Alapítvány","Örömtanya Állatvédők",
  "Kis Gömböc Menhely","Vidám Farok Állatvédelem","Remény Sziget Menhely",
  "Szerető Otthon Állatmentők","Talpalapítvány","Kóbor Kedvencek Menhelye",
  "Bundás Barátok Egyesület","Mancsok Háza","Állati Szerencse Alapítvány",
  "Boldog Ugatás Menhely","Cicás Kaland Állatvédők","Fürge Farkú Menhely",
  "Doromboló Mancs Egyesület","Mentő Karom Alapítvány","Kutyabarát Sziget",
  "Macskabarát Menedék","Tündér Mancs Menhely","Szabad Lélek Állatvédők",
  "Gondoskodó Kéz Menhely","Kedves Ugatás Alapítvány","Arany Mancs Egyesület",
];

const HU_FIRST = ["Anna","Péter","Kata","Márton","Ági","Balázs","Eszter","Gábor","Lilla","Zoltán",
  "Nóra","Tamás","Bori","Ádám","Réka","Dávid","Zsófi","Kristóf","Viki","Bence",
  "Hanna","Gergő","Fanni","Milán","Juli","Áron","Orsi","Dani","Dorka","Máté"];
const HU_LAST  = ["Nagy","Kovács","Tóth","Szabó","Horváth","Varga","Kiss","Molnár","Fekete","Fehér",
  "Simon","Rácz","Takács","Juhász","Lakatos","Mészáros","Oláh","Balogh","Papp","Farkas"];

const DOG_NAMES  = ["Bodri","Morzsa","Bundás","Fülöp","Dió","Makk","Csoki","Berci","Pötyi","Tappancs",
  "Szikra","Manó","Bogár","Göndör","Pajkos","Ráró","Süni","Topsi","Virgonc","Rex",
  "Brutus","Cézár","Max","Blöki","Kormos","Zsemle","Keksz","Mufasa","Pumba","Simba"];
const CAT_NAMES  = ["Cica","Mimi","Cirmi","Tündér","Holdas","Éjfél","Narancs","Hópehely","Tigris",
  "Selymes","Bolyhos","Párducka","Szürke","Fekete","Fehérke","Foltos","Csíkos","Luna","Misu","Pluto"];
const OTHER_NAMES= ["Füles","Pici","Nyuszi","Csillag","Buborék","Gyöngy","Pipacs","Mókus","Tüske","Toboz"];
const DOG_BREEDS = ["Keverék","Labrador","Német juhász","Beagle","Golden Retriever","Husky",
  "Rottweiler","Puli","Vizsla","Mudi","Pumi","Magyar Agár","Border Collie","Boxer"];
const CAT_BREEDS = ["Keverék","Európai rövidszőrű","Maine Coon","Perzsa","Sziámi","Brit rövidszőrű","Bengal"];
const COLORS     = ["fekete","fehér","barna","szürke","tarka","arany","vörös","foltos","krém","kékes-szürke"];
const ANIMAL_DESCS = [
  "{name} egy kedves, játékos állat, aki szerető gazdira vár. Gyerekekkel és más állatokkal is jól kijön.",
  "{name} igazi csodaállat – engedelmes, tanulékony, és imádja az emberek társaságát.",
  "Menhely életéhez képest {name} nagyon kiegyensúlyozott. Türelmes, szeretne végre otthont kapni.",
  "{name} az egyik leghűségesebb lakónk. Minden nap reméli, hogy megtalálja új gazdáját.",
  "Szelíd és csendes természetű, {name} ideális lakótársa lenne egy nyugodt háztartásnak.",
  "{name} nagyon aktív és energikus – futáshoz, kiránduláshoz keres aktív gazdát.",
  "Korábban bántalmazott állat, {name} most lassan nyílik meg. Türelmes gazdát keres.",
  "{name} steril, chippelt, oltott. Minden szempontból felkészítve az új otthonra.",
];

const CAMPAIGN_TITLES = [
  "Téli takarmány gyűjtés","Gyógykezelési alap","Kennel felújítás","Kóbor macskák ivartalanítása",
  "Sürgős állatorvosi ellátás","Új befogadó szoba kialakítása","Közös séta program finanszírozása",
  "Kutya-szocializációs tábor","Macskahotel építés","Őszi ellátási tartalék",
  "Vakcinázási kampány","Mikrochip nap szervezése","Karácsonyi örökbefogadási akció",
  "Tavaszi takarítás és felújítás","Mozgáskorlátozott állatok ellátása",
];

const REPORT_DESCS = [
  "A környéken láttam elveszve kóborolni, nyaka körül régi nyakörv volt.",
  "A parkban találtuk, nagyon ijedt és éhes volt. Valószínűleg napok óta kóborol.",
  "A kert kerítésén bejött, azóta nálunk van. Gazdáját keressük.",
  "Az utcán sérülten találtuk, azóta állatorvosnál van. Gazdájának szóljon.",
  "Nagyon barátságos, valaki elveszíthette. Örömmel visszaadjuk.",
  "A vasút közelében láttuk kóborolni, félénk de nem agresszív.",
];

const MSG_TEXTS = [
  "Érdeklődnék az állat örökbefogadásáról, több információt kérnék.",
  "Mikor lehet megnézni személyesen? Hétvégén érnék rá.",
  "Lakásban lakom kerttel, van tapasztalatom kutyákkal.",
  "A gyerekeink nagyon szeretnék, kérlek írj vissza!",
  "Van-e lehetőség próbaidős befogadásra?",
  "Köszönöm a gyors választ! Mikor mehetünk?",
  "Sajnos végül nem tudtuk vállalni, de köszönöm a segítséget.",
  "Megérkezett hozzánk és nagyon jól érzi magát, köszönöm!",
  "Rendben, akkor szombaton délután 3-ra megállapodunk.",
  "Kérlek küldd el az örökbefogadási papírokat e-mailben is.",
];

const TIER_TEMPLATES = [
  { name: "Alapcsomag", amount: 1000,  description: "Havi 1 000 Ft – alapvető takarmány és gondozás" },
  { name: "Barát",      amount: 2500,  description: "Havi 2 500 Ft – egy állat heti ellátása" },
  { name: "Védnök",     amount: 5000,  description: "Havi 5 000 Ft – állatorvosi alap hozzájárulás" },
  { name: "Nagylelkű",  amount: 10000, description: "Havi 10 000 Ft – igazi mentőangyal" },
];

// ─── Fő seed logika ───────────────────────────────────────────────────────────

async function runSeed() {
  // ── Törlés (újabb modellek először) ──────────────────────────────────────
  await prisma.notification.deleteMany({});
  await prisma.eventRegistration.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.sponsorship.deleteMany({});
  await prisma.fosterSupplyLog.deleteMany({});
  await prisma.fosterProfile.deleteMany({});
  await prisma.behaviorLog.deleteMany({});
  await prisma.kennel.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.volunteerAttendance.deleteMany({});
  await prisma.volunteerTaskAssignment.deleteMany({});
  await prisma.volunteerTask.deleteMany({});
  await prisma.volunteer.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.adoptionFollowUp.deleteMany({});
  await prisma.healthRecord.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.donation.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.adoptionApplication.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.donationTier.deleteMany({});
  await prisma.animalReport.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.animalImage.deleteMany({});
  await prisma.animal.deleteMany({});
  await prisma.shelterAdmin.deleteMany({});
  await prisma.shelter.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  // ── Jelszavak ────────────────────────────────────────────────────────────
  const adminPwd = await hash("Admin1234!", 10);
  const userPwd  = await hash("User1234!",  10);

  // ── 1. Superadmin ────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Rendszergazda", email: "admin@menhely.hu",
      password: adminPwd, role: Role.SUPER_ADMIN, emailVerified: new Date(),
      city: "Budapest", country: "HU",
    },
  });

  // ── 2. Normál felhasználók (300 db) ──────────────────────────────────────
  const userRows = Array.from({ length: 300 }, (_, i) => ({
    name:          `${ri(HU_FIRST)} ${ri(HU_LAST)}`,
    email:         `user${i + 1}@example.com`,
    password:      userPwd,
    role:          Role.USER as Role,
    emailVerified: rndDate(new Date("2024-06-01"), new Date("2025-06-01")),
    city:          ri(CITIES).name,
    country:       "HU",
    createdAt:     rndDate(new Date("2024-06-01"), new Date("2025-03-01")),
  }));
  await prisma.user.createMany({ data: userRows, skipDuplicates: true });

  const allUsers = await prisma.user.findMany({
    where: { role: Role.USER },
    select: { id: true, city: true },
  });

  // ── 3. Menhelyek + menhely adminok (30 db) ───────────────────────────────
  const shelterAdminEmails = SHELTER_NAMES.map((_, i) => `shelteradmin${i + 1}@menhely.hu`);
  await prisma.user.createMany({
    data: shelterAdminEmails.map((email, i) => ({
      name:          `${SHELTER_NAMES[i]} Admin`,
      email,
      password:      adminPwd,
      role:          Role.SHELTER_ADMIN as Role,
      emailVerified: new Date(),
      country:       "HU",
    })),
    skipDuplicates: true,
  });
  const shelterAdminUsers = await prisma.user.findMany({
    where: { email: { in: shelterAdminEmails } },
    select: { id: true, email: true },
  });
  const adminIdByEmail = Object.fromEntries(shelterAdminUsers.map(u => [u.email, u.id]));

  const shelters: { id: string; adminId: string }[] = [];
  for (let i = 0; i < SHELTER_NAMES.length; i++) {
    const name  = SHELTER_NAMES[i];
    const city  = CITIES[i % CITIES.length];
    const slug  = slugify(name, String(i + 1));
    const email = shelterAdminEmails[i];

    const s = await prisma.shelter.upsert({
      where:  { slug },
      update: {},
      create: {
        name, slug,
        city:        city.name,
        country:     "HU",
        address:     `Állatvédő utca ${rn(1, 99)}.`,
        zipCode:     String(rn(1000, 9999)),
        phone:       `+3630${rn(1000000, 9999999)}`,
        email:       `info@${slug}.hu`,
        website:     `https://www.${slug}.hu`,
        description: `${name} 2010 óta működik ${city.name}ban/ben. Több száz állatot mentettünk már meg.`,
        isVerified:  rb(0.85),
        isActive:    true,
        lat:         city.lat + (Math.random() - 0.5) * 0.05,
        lng:         city.lng + (Math.random() - 0.5) * 0.05,
      },
    });

    const adminId = adminIdByEmail[email];
    await prisma.shelterAdmin.upsert({
      where:  { userId_shelterId: { userId: adminId, shelterId: s.id } },
      update: {},
      create: { userId: adminId, shelterId: s.id },
    });

    shelters.push({ id: s.id, adminId });
  }

  // ── 4. Adományozási szintek (4 per menhely = 120 db) ────────────────────
  const tierRows = shelters.flatMap(s =>
    TIER_TEMPLATES.map(t => ({
      shelterId:   s.id,
      name:        t.name,
      description: t.description,
      amount:      t.amount,
      isActive:    true,
    }))
  );
  await prisma.donationTier.createMany({ data: tierRows });
  const allTiers = await prisma.donationTier.findMany({ select: { id: true, shelterId: true } });

  // ── 5. Kampányok (2 per menhely = 60 db) ─────────────────────────────────
  const campaignRows = shelters.flatMap((s, si) =>
    [0, 1].map(ci => {
      const title     = ri(CAMPAIGN_TITLES);
      const cslug     = slugify(title, `${si}-${ci}-${Date.now()}`);
      const createdAt = rndDate(new Date("2025-01-01"), new Date("2025-10-01"));
      const status    = rb(0.8) ? CampaignStatus.ACTIVE : CampaignStatus.COMPLETED;
      return {
        userId:       s.adminId,
        shelterId:    s.id,
        title,
        slug:         cslug,
        description:  `${title} – segíts, hogy még több állatot tudjunk megmenteni!`,
        targetAmount: ri([500_000, 800_000, 1_000_000, 1_500_000, 2_000_000]),
        raisedAmount: 0,
        status,
        imageUrl:     null,
        createdAt,
        endsAt:       status === CampaignStatus.ACTIVE
                        ? new Date(NOW.getTime() + rn(30, 180) * 86_400_000)
                        : new Date(createdAt.getTime() + rn(90, 365) * 86_400_000),
      };
    })
  );
  await prisma.campaign.createMany({ data: campaignRows });
  const allCampaigns = await prisma.campaign.findMany({ select: { id: true, shelterId: true } });

  // ── 6. Állatok (~55 per menhely ≈ 1 650 db) ──────────────────────────────
  const animalRows: {
    shelterId: string; name: string; slug: string; type: AnimalType;
    breed: string | null; age: number; size: AnimalSize; gender: string;
    color: string; weight: number; description: string;
    isVaccinated: boolean; isNeutered: boolean; isMicrochipped: boolean;
    isGoodWithKids: boolean; isGoodWithDogs: boolean; isGoodWithCats: boolean;
    status: AnimalStatus; arrivedAt: Date; adoptedAt: Date | null;
  }[] = [];

  const STATUS_POOL: AnimalStatus[] = [
    AnimalStatus.AVAILABLE, AnimalStatus.AVAILABLE, AnimalStatus.AVAILABLE,
    AnimalStatus.AVAILABLE, AnimalStatus.PENDING, AnimalStatus.ADOPTED,
    AnimalStatus.ADOPTED, AnimalStatus.FOSTER, AnimalStatus.MEDICAL_HOLD,
  ];

  for (const s of shelters) {
    for (let ai = 0; ai < 55; ai++) {
      const isDog   = rb(0.55);
      const isCat   = !isDog && rb(0.70);
      const type    = isDog ? AnimalType.DOG : isCat ? AnimalType.CAT : ri([AnimalType.RABBIT, AnimalType.BIRD, AnimalType.OTHER]);
      const names   = isDog ? DOG_NAMES : isCat ? CAT_NAMES : OTHER_NAMES;
      const breeds  = isDog ? DOG_BREEDS : isCat ? CAT_BREEDS : null;
      const aname   = ri(names);
      const slug    = slugify(aname, `${s.id.slice(-4)}-${ai}`);
      const status  = ri(STATUS_POOL);
      const arrivedAt = rndDate(new Date("2025-01-01"), NOW);

      animalRows.push({
        shelterId:      s.id,
        name:           aname,
        slug,
        type,
        breed:          breeds ? ri(breeds) : null,
        age:            rn(1, 144),
        size:           ri([AnimalSize.SMALL, AnimalSize.MEDIUM, AnimalSize.LARGE, AnimalSize.EXTRA_LARGE]),
        gender:         ri(["MALE", "FEMALE"]),
        color:          ri(COLORS),
        weight:         parseFloat((rn(1, 45) + Math.random()).toFixed(1)),
        description:    ri(ANIMAL_DESCS).replace(/{name}/g, aname),
        isVaccinated:   rb(0.75),
        isNeutered:     rb(0.60),
        isMicrochipped: rb(0.70),
        isGoodWithKids: rb(0.65),
        isGoodWithDogs: rb(0.60),
        isGoodWithCats: rb(0.50),
        status,
        arrivedAt,
        adoptedAt: status === AnimalStatus.ADOPTED
          ? new Date(Math.min(arrivedAt.getTime() + rn(14, 180) * 86_400_000, NOW.getTime()))
          : null,
      });
    }
  }

  for (let i = 0; i < animalRows.length; i += 500) {
    await prisma.animal.createMany({ data: animalRows.slice(i, i + 500), skipDuplicates: true });
  }
  const allAnimals = await prisma.animal.findMany({
    select: { id: true, shelterId: true, status: true, arrivedAt: true, adoptedAt: true, type: true },
  });

  // ── 6b. Állat képek (1 kép / állat) ──────────────────────────────────────
  const IMG_KEYWORDS: Record<AnimalType, string> = {
    DOG: "dog", CAT: "cat", RABBIT: "rabbit", BIRD: "parrot", OTHER: "hamster",
  };
  const imgRows = allAnimals.map((a, i) => ({
    animalId:  a.id,
    url:       `https://loremflickr.com/640/480/${IMG_KEYWORDS[a.type]}?lock=${i + 1}`,
    alt:       "Állat fotó",
    isPrimary: true,
    order:     0,
  }));
  for (let i = 0; i < imgRows.length; i += 500) {
    await prisma.animalImage.createMany({ data: imgRows.slice(i, i + 500), skipDuplicates: true });
  }

  // ── 7. Örökbefogadási kérelmek ────────────────────────────────────────────
  const adoptableAnimals = allAnimals.filter(a =>
    a.status === AnimalStatus.ADOPTED || a.status === AnimalStatus.PENDING
  );
  const seenPairs = new Set<string>();
  const appRows: {
    userId: string; animalId: string; status: ApplicationStatus;
    message: string; homeType: string; hasGarden: boolean;
    hasChildren: boolean; hasPets: boolean; experience: string;
    createdAt: Date; reviewedAt: Date | null;
  }[] = [];
  const nowMs = NOW.getTime();

  for (const animal of adoptableAnimals) {
    const candidateUsers = [...allUsers].sort(() => Math.random() - 0.5).slice(0, rn(1, 4));
    for (const u of candidateUsers) {
      const pair = `${u.id}:${animal.id}`;
      if (seenPairs.has(pair)) continue;
      seenPairs.add(pair);

      const isApproved = animal.status === AnimalStatus.ADOPTED;
      let createdAt: Date;
      let reviewedAt: Date | null;

      if (isApproved && animal.adoptedAt) {
        const adopted = Math.min(animal.adoptedAt.getTime(), nowMs);
        reviewedAt = new Date(adopted);
        createdAt  = new Date(adopted - rn(3, 21) * 86_400_000);
        if (animal.arrivedAt && createdAt < animal.arrivedAt) {
          createdAt = new Date(animal.arrivedAt.getTime());
        }
      } else {
        reviewedAt = null;
        createdAt  = rndDate(new Date("2025-01-01"), NOW);
      }

      appRows.push({
        userId:      u.id,
        animalId:    animal.id,
        status:      isApproved ? ApplicationStatus.APPROVED : ApplicationStatus.PENDING,
        message:     "Szeretném örökbefogadni ezt az állatot. Biztonságos, szerető otthont tudok nyújtani.",
        homeType:    ri(["HOUSE", "APARTMENT", "OTHER"]),
        hasGarden:   rb(0.5),
        hasChildren: rb(0.4),
        hasPets:     rb(0.3),
        experience:  "Volt már állatom, szívesen vállalom a gondozást.",
        createdAt,
        reviewedAt,
      });
    }
  }
  const availableAnimals = allAnimals.filter(a => a.status === AnimalStatus.AVAILABLE);
  for (const animal of availableAnimals.slice(0, 300)) {
    const u = ri(allUsers);
    const pair = `${u.id}:${animal.id}`;
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    appRows.push({
      userId: u.id, animalId: animal.id,
      status: "PENDING",
      message: "Érdeklődöm az örökbefogadás iránt.",
      homeType: ri(["HOUSE", "APARTMENT"]),
      hasGarden: rb(0.5), hasChildren: rb(0.4), hasPets: rb(0.3),
      experience: "Korábban volt macskám.",
      createdAt: rndDate(new Date("2025-01-01"), NOW),
      reviewedAt: null,
    });
  }
  for (let i = 0; i < appRows.length; i += 500) {
    await prisma.adoptionApplication.createMany({ data: appRows.slice(i, i + 500), skipDuplicates: true });
  }

  // ── 8. Előfizetések (600 db) ──────────────────────────────────────────────
  const subPairs = new Set<string>();
  const subRows: {
    userId: string; tierId: string; status: SubscriptionStatus;
    createdAt: Date; cancelledAt: Date | null;
  }[] = [];
  let subAttempts = 0;
  while (subRows.length < 600 && subAttempts < 3000) {
    subAttempts++;
    const u    = ri(allUsers);
    const tier = ri(allTiers);
    const key  = `${u.id}:${tier.id}`;
    if (subPairs.has(key)) continue;
    subPairs.add(key);
    const createdAt   = seasonalDate();
    const isCancelled = rb(0.15);
    subRows.push({
      userId:      u.id,
      tierId:      tier.id,
      status:      isCancelled ? SubscriptionStatus.CANCELLED : SubscriptionStatus.ACTIVE,
      createdAt,
      cancelledAt: isCancelled
        ? new Date(createdAt.getTime() + rn(30, 300) * 86_400_000)
        : null,
    });
  }
  await prisma.subscription.createMany({ data: subRows, skipDuplicates: true });

  // ── 9. Adományok (2 000 db) ───────────────────────────────────────────────
  const AMOUNTS = [500,1000,1500,2000,3000,5000,8000,10000,15000,20000,25000,50000];
  const donRows: {
    userId: string | null; campaignId: string; amount: number;
    message: string | null; isAnonymous: boolean;
    stripeSessionId: string; paidAt: Date; createdAt: Date;
  }[] = [];
  for (let i = 0; i < 2000; i++) {
    const campaign  = ri(allCampaigns);
    const isAnon    = rb(0.2);
    const user      = isAnon ? null : ri(allUsers);
    const paidAt    = seasonalDate();
    donRows.push({
      userId:          user?.id ?? null,
      campaignId:      campaign.id,
      amount:          ri(AMOUNTS),
      message:         rb(0.3) ? "Hajrá, csináljátok tovább!" : null,
      isAnonymous:     isAnon,
      stripeSessionId: `cs_seed_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
      paidAt,
      createdAt:       paidAt,
    });
  }
  const donBycamp = new Map<string, number>();
  for (const d of donRows) {
    donBycamp.set(d.campaignId, (donBycamp.get(d.campaignId) ?? 0) + d.amount);
  }
  for (let i = 0; i < donRows.length; i += 500) {
    await prisma.donation.createMany({ data: donRows.slice(i, i + 500), skipDuplicates: true });
  }
  for (const [campaignId, raised] of donBycamp) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { raisedAmount: raised } });
  }

  // ── 10. Bejelentések (500 db) ─────────────────────────────────────────────
  const reportRows = Array.from({ length: 500 }, (_, i) => {
    const city    = ri(CITIES);
    const isDog   = rb(0.6);
    const type    = ri([ReportType.LOST, ReportType.LOST, ReportType.FOUND, ReportType.STRAY]);
    const user    = rb(0.7) ? ri(allUsers) : null;
    const reportedAt = rndDate(new Date("2025-01-01"), NOW);
    return {
      userId:       user?.id ?? null,
      type,
      animalType:   isDog ? AnimalType.DOG : ri([AnimalType.CAT, AnimalType.RABBIT, AnimalType.OTHER]),
      name:         rb(0.7) ? ri(isDog ? DOG_NAMES : CAT_NAMES) : null,
      breed:        rb(0.5) ? ri(isDog ? DOG_BREEDS : CAT_BREEDS) : null,
      color:        ri(COLORS),
      gender:       ri(["MALE","FEMALE","UNKNOWN"]),
      description:  ri(REPORT_DESCS),
      city:         city.name,
      address:      `${ri(["Fő utca","Park","Vasút","Erdő","Piac"])} ${rn(1,50)}.`,
      lat:          city.lat + (Math.random() - 0.5) * 0.1,
      lng:          city.lng + (Math.random() - 0.5) * 0.1,
      contactName:  `${ri(HU_FIRST)} ${ri(HU_LAST)}`,
      contactPhone: `+3630${rn(1000000,9999999)}`,
      contactEmail: user ? `user${i + 1}@example.com` : `bejelento${i}@example.com`,
      status:       rb(0.3) ? ReportStatus.RESOLVED : ReportStatus.ACTIVE,
      createdAt:    reportedAt,
    };
  });
  for (let i = 0; i < reportRows.length; i += 500) {
    await prisma.animalReport.createMany({ data: reportRows.slice(i, i + 500) });
  }

  // ── 11. Üzenetek / Beszélgetések (300 konverzáció) ────────────────────────
  const convPairs   = new Set<string>();
  const convRecords: { id: string; senderId: string; shelterAdminId: string; createdAt: Date }[] = [];

  const convCandidates = allAnimals
    .filter(a => a.status !== AnimalStatus.ADOPTED)
    .slice(0, 400);

  for (const animal of convCandidates) {
    if (convRecords.length >= 300) break;
    const user     = ri(allUsers);
    const pair     = `${animal.id}:${user.id}`;
    if (convPairs.has(pair)) continue;
    convPairs.add(pair);

    const shelter  = shelters.find(s => s.id === animal.shelterId)!;
    const convAt   = rndDate(new Date("2025-02-01"), NOW);

    const conv = await prisma.conversation.create({
      data: {
        animalId:  animal.id,
        userId:    user.id,
        shelterId: shelter.id,
        createdAt: convAt,
        updatedAt: convAt,
      },
    });
    convRecords.push({ id: conv.id, senderId: user.id, shelterAdminId: shelter.adminId, createdAt: convAt });
  }

  const msgRows: {
    conversationId: string; senderId: string; content: string;
    readAt: Date | null; createdAt: Date;
  }[] = [];
  for (const c of convRecords) {
    const msgCount = rn(2, 6);
    for (let m = 0; m < msgCount; m++) {
      const isUser   = m % 2 === 0;
      const sender   = isUser ? c.senderId : c.shelterAdminId;
      const msgTime  = new Date(c.createdAt.getTime() + m * rn(1, 48) * 3_600_000);
      msgRows.push({
        conversationId: c.id,
        senderId:       sender,
        content:        ri(MSG_TEXTS),
        readAt:         rb(0.7) ? msgTime : null,
        createdAt:      msgTime,
      });
    }
  }
  for (let i = 0; i < msgRows.length; i += 500) {
    await prisma.message.createMany({ data: msgRows.slice(i, i + 500) });
  }

  // ── 12. HealthRecord ──────────────────────────────────────────────────────
  const HR_TYPES: HealthRecordType[] = [
    HealthRecordType.VACCINATION, HealthRecordType.DEWORMING, HealthRecordType.CHECKUP,
    HealthRecordType.TREATMENT, HealthRecordType.VET_VISIT, HealthRecordType.SURGERY,
  ];
  const HR_TITLES: Record<HealthRecordType, string[]> = {
    VACCINATION: ["Veszettség oltás", "Kombinált oltás", "Kennel cough oltás"],
    DEWORMING:   ["Féregtelenítés", "Bolha-kullancs kezelés"],
    CHECKUP:     ["Éves szűrővizsgálat", "Fogászati ellenőrzés"],
    TREATMENT:   ["Sebkezelés", "Gyógyszeres kezelés", "Bőrkezelés"],
    VET_VISIT:   ["Általános vizsgálat", "Konzultáció", "Vérvétel"],
    SURGERY:     ["Ivartalanítás", "Daganat eltávolítás"],
  };

  const animals1200 = allAnimals.slice(0, 1200);
  const hrRows: {
    animalId: string; type: HealthRecordType; title: string;
    description: string | null; date: Date; nextDueDate: Date | null;
    vetName: string | null; createdById: string | null;
  }[] = [];

  for (const animal of animals1200) {
    const numRecords = rn(1, 3);
    for (let r = 0; r < numRecords; r++) {
      const type  = ri(HR_TYPES);
      const date  = rndDate(new Date("2024-06-01"), NOW);
      hrRows.push({
        animalId:    animal.id,
        type,
        title:       ri(HR_TITLES[type]),
        description: rb(0.6) ? `${type} kezelés elvégezve, az állat jól tűrte.` : null,
        date,
        nextDueDate: rb(0.4) ? new Date(date.getTime() + rn(30, 365) * 86_400_000) : null,
        vetName:     rb(0.7) ? `Dr. ${ri(HU_LAST)} ${ri(HU_FIRST).slice(0, 1)}.` : null,
        createdById: null,
      });
    }
  }
  for (let i = 0; i < hrRows.length; i += 500) {
    await prisma.healthRecord.createMany({ data: hrRows.slice(i, i + 500) });
  }

  // ── 13. Review ────────────────────────────────────────────────────────────
  const reviewPairs = new Set<string>();
  const reviewRows: {
    authorId: string; shelterId: string; rating: number; comment: string | null;
  }[] = [];
  const REVIEW_COMMENTS = [
    "Kiváló menhely, kedves dolgozók!",
    "Nagyon segítőkészek, ajánlom mindenkinek.",
    "Szép környezet, gondos ápolás.",
    "Kicsit sokáig tartott, de végül minden rendben.",
    "Örülünk az új kedvencünknek, köszönöm a segítséget!",
    "Profi csapat, átlátható folyamat.",
  ];

  let reviewAttempts = 0;
  while (reviewRows.length < 300 && reviewAttempts < 3000) {
    reviewAttempts++;
    const user    = ri(allUsers);
    const shelter = ri(shelters);
    const pair    = `${user.id}:${shelter.id}`;
    if (reviewPairs.has(pair)) continue;
    reviewPairs.add(pair);
    reviewRows.push({
      authorId:  user.id,
      shelterId: shelter.id,
      rating:    rn(3, 5),
      comment:   rb(0.6) ? ri(REVIEW_COMMENTS) : null,
    });
  }
  await prisma.review.createMany({ data: reviewRows, skipDuplicates: true });

  // ── 14. Volunteer + VolunteerAttendance ───────────────────────────────────
  const VOL_STATUS_POOL: VolunteerStatus[] = [
    VolunteerStatus.ACTIVE, VolunteerStatus.ACTIVE, VolunteerStatus.ACTIVE,
    VolunteerStatus.PENDING, VolunteerStatus.INACTIVE, VolunteerStatus.REJECTED,
  ];
  const volPairs = new Set<string>();
  const volRows: {
    userId: string; shelterId: string; status: VolunteerStatus;
    motivation: string | null; skills: string | null; availability: string | null;
  }[] = [];

  for (const shelter of shelters) {
    const numVols = rn(2, 5);
    for (let v = 0; v < numVols; v++) {
      const user = ri(allUsers);
      const pair = `${user.id}:${shelter.id}`;
      if (volPairs.has(pair)) continue;
      volPairs.add(pair);
      volRows.push({
        userId:       user.id,
        shelterId:    shelter.id,
        status:       ri(VOL_STATUS_POOL),
        motivation:   rb(0.7) ? "Szeretem az állatokat és szeretnék segíteni." : null,
        skills:       rb(0.5) ? ri(["Állatorvosi alapismeretek","Kutyakiképzés","Fotózás","Sofőr","Takarítás"]) : null,
        availability: rb(0.6) ? ri(["Hétvégén","Hétköznap reggel","Bármikor","Havonta egyszer"]) : null,
      });
    }
  }
  for (let i = 0; i < volRows.length; i += 500) {
    await prisma.volunteer.createMany({ data: volRows.slice(i, i + 500), skipDuplicates: true });
  }

  const activeVolunteers = await prisma.volunteer.findMany({
    where:  { status: VolunteerStatus.ACTIVE },
    select: { id: true },
  });

  const attRows: {
    volunteerId: string; date: Date; hours: number; note: string | null;
  }[] = [];
  for (const vol of activeVolunteers) {
    for (let a = 0; a < 2; a++) {
      attRows.push({
        volunteerId: vol.id,
        date:        rndDate(new Date("2025-01-01"), NOW),
        hours:       ri([1, 2, 3, 4]),
        note:        rb(0.3) ? "Állatok etetése és takarítás." : null,
      });
    }
  }
  if (attRows.length > 0) {
    await prisma.volunteerAttendance.createMany({ data: attRows });
  }

  // ── 15. VolunteerTask ─────────────────────────────────────────────────────
  const TASK_TITLES = [
    "Kutyák sétáltatása","Etetés","Kennelek takarítása","Szocializáció macskákkal",
    "Fotózás állományhoz","Örökbefogadási esemény segítség","Szállítás állatorvoshoz",
    "Adományok rendezése","Online kampány segítség",
  ];
  const taskRows: {
    shelterId: string; title: string; description: string | null;
    scheduledAt: Date; maxVolunteers: number;
  }[] = [];

  for (const shelter of shelters) {
    const numTasks = rn(1, 3);
    for (let t = 0; t < numTasks; t++) {
      taskRows.push({
        shelterId:     shelter.id,
        title:         ri(TASK_TITLES),
        description:   rb(0.5) ? "Segítség szükséges az állatok gondozásához." : null,
        scheduledAt:   rndDate(new Date("2025-01-01"), new Date(NOW.getTime() + 60 * 86_400_000)),
        maxVolunteers: rn(1, 5),
      });
    }
  }
  await prisma.volunteerTask.createMany({ data: taskRows });

  // ── 16. Appointment ───────────────────────────────────────────────────────
  const AP_STATUS_POOL: AppointmentStatus[] = [
    AppointmentStatus.PENDING, AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ];
  const apptRows: {
    shelterId: string; userId: string; animalId: string | null;
    status: AppointmentStatus; proposedAt: Date; confirmedAt: Date | null;
    note: string | null; adminNote: string | null; cancelledBy: string | null;
  }[] = [];

  for (let i = 0; i < 200; i++) {
    const user    = ri(allUsers);
    const shelter = ri(shelters);
    const status  = ri(AP_STATUS_POOL);
    const proposed = rndDate(new Date("2025-01-01"), new Date(NOW.getTime() + 30 * 86_400_000));
    apptRows.push({
      shelterId:   shelter.id,
      userId:      user.id,
      animalId:    null,
      status,
      proposedAt:  proposed,
      confirmedAt: (status === AppointmentStatus.CONFIRMED || status === AppointmentStatus.COMPLETED)
                     ? proposed : null,
      note:        rb(0.5) ? "Érdeklődöm egy állat megtekintéséről." : null,
      adminNote:   status !== AppointmentStatus.PENDING ? (rb(0.4) ? "Várjuk!" : null) : null,
      cancelledBy: status === AppointmentStatus.CANCELLED ? ri(["USER","ADMIN"]) : null,
    });
  }
  await prisma.appointment.createMany({ data: apptRows });

  // ── 17. AdoptionFollowUp ──────────────────────────────────────────────────
  const approvedApps = await prisma.adoptionApplication.findMany({
    where:  { status: ApplicationStatus.APPROVED },
    select: { id: true, createdAt: true },
    take:   300,
  });

  const followUpRows: {
    applicationId: string; scheduledAt: Date; status: FollowUpStatus;
    completedAt: Date | null; wellbeing: number | null; notes: string | null;
  }[] = [];

  for (const app of approvedApps) {
    for (const daysOffset of [30, 90]) {
      const scheduledAt = new Date(app.createdAt.getTime() + daysOffset * 86_400_000);
      const isPast      = scheduledAt <= NOW;
      const fuStatus    = isPast
        ? (rb(0.8) ? FollowUpStatus.COMPLETED : FollowUpStatus.OVERDUE)
        : FollowUpStatus.PENDING;
      followUpRows.push({
        applicationId: app.id,
        scheduledAt,
        status:        fuStatus,
        completedAt:   fuStatus === FollowUpStatus.COMPLETED ? scheduledAt : null,
        wellbeing:     fuStatus === FollowUpStatus.COMPLETED ? rn(3, 5) : null,
        notes:         fuStatus === FollowUpStatus.COMPLETED
          ? ri(["Nagyon jól érzi magát!","Beilleszkedett a családba.","Kiváló egészségi állapot."])
          : null,
      });
    }
  }
  if (followUpRows.length > 0) {
    for (let i = 0; i < followUpRows.length; i += 500) {
      await prisma.adoptionFollowUp.createMany({ data: followUpRows.slice(i, i + 500), skipDuplicates: true });
    }
  }

  // ── 18. InventoryItem + InventoryTransaction ──────────────────────────────
  const INV_CATEGORIES: InventoryCategory[] = [
    InventoryCategory.FOOD, InventoryCategory.MEDICINE, InventoryCategory.SUPPLIES,
    InventoryCategory.CLEANING, InventoryCategory.EQUIPMENT, InventoryCategory.OTHER,
  ];
  const ITEM_NAMES: Record<InventoryCategory, string[]> = {
    FOOD:      ["Száraztáp kutya","Száraztáp macska","Konzervtáp","Jutalomfalat"],
    MEDICINE:  ["Bolha-kullancs spray","Féregtelenítő tabletta","Sebtapasz","Fertőtlenítő"],
    SUPPLIES:  ["Pórázok","Nyakörv","Hordozó kosár","Etetőtál"],
    CLEANING:  ["Fertőtlenítő oldat","Papírtörlő","Szemetes zsák","Söprű"],
    EQUIPMENT: ["Karabiner","Tolókocsi","Mérleg","Hőmérő"],
    OTHER:     ["Ajándékkártya","Prospektus","Egyéb kellék"],
  };

  const invRows: {
    shelterId: string; name: string; category: InventoryCategory;
    unit: string; quantity: number; minQuantity: number | null;
    expiresAt: Date | null; note: string | null;
  }[] = [];

  for (const shelter of shelters) {
    const numItems = rn(3, 6);
    for (let item = 0; item < numItems; item++) {
      const category = ri(INV_CATEGORIES);
      invRows.push({
        shelterId:   shelter.id,
        name:        ri(ITEM_NAMES[category]),
        category,
        unit:        ri(["kg","liter","db","csomag"]),
        quantity:    rn(0, 200),
        minQuantity: rb(0.6) ? rn(5, 30) : null,
        expiresAt:   rb(0.3) ? new Date(NOW.getTime() + rn(30, 365) * 86_400_000) : null,
        note:        null,
      });
    }
  }
  await prisma.inventoryItem.createMany({ data: invRows });

  const allInvItems = await prisma.inventoryItem.findMany({
    select: { id: true, quantity: true },
  });
  const txRows: {
    itemId: string; type: InventoryTxType; quantity: number; note: string | null;
  }[] = allInvItems
    .filter(item => item.quantity > 0)
    .map(item => ({
      itemId:   item.id,
      type:     InventoryTxType.IN,
      quantity: item.quantity,
      note:     "Nyitókészlet",
    }));

  for (let i = 0; i < txRows.length; i += 500) {
    await prisma.inventoryTransaction.createMany({ data: txRows.slice(i, i + 500) });
  }

  // ── 19. Notification ─────────────────────────────────────────────────────
  const NT_POOL: NotificationType[] = [
    NotificationType.APPLICATION_SUBMITTED,
    NotificationType.APPLICATION_APPROVED,
    NotificationType.APPOINTMENT_NEW,
    NotificationType.APPOINTMENT_CONFIRMED,
    NotificationType.VOLUNTEER_APPROVED,
    NotificationType.DONATION_RECEIVED,
    NotificationType.NEW_MESSAGE,
  ];
  const NOTIF_TITLES: Record<string, string> = {
    APPLICATION_SUBMITTED: "Új kérelem érkezett",
    APPLICATION_APPROVED:  "Kérelmed elfogadva",
    APPOINTMENT_NEW:       "Új időpontfoglalás",
    APPOINTMENT_CONFIRMED: "Időpontod visszaigazolva",
    VOLUNTEER_APPROVED:    "Önkéntességed jóváhagyva",
    DONATION_RECEIVED:     "Adomány beérkezett",
    NEW_MESSAGE:           "Új üzeneted van",
  };

  const notifRows: {
    userId: string; type: NotificationType; title: string;
    body: string | null; href: string | null; readAt: Date | null; createdAt: Date;
  }[] = [];

  const first50Users = allUsers.slice(0, Math.min(50, allUsers.length));
  for (const user of first50Users) {
    const numNotifs = rn(3, 7);
    for (let n = 0; n < numNotifs; n++) {
      const type      = ri(NT_POOL);
      const createdAt = rndDate(new Date("2025-01-01"), NOW);
      notifRows.push({
        userId:    user.id,
        type,
        title:     NOTIF_TITLES[type] ?? "Értesítés",
        body:      rb(0.5) ? "Kattints a részletekért." : null,
        href:      rb(0.6) ? "/dashboard" : null,
        readAt:    rb(0.5) ? createdAt : null,
        createdAt,
      });
    }
  }
  await prisma.notification.createMany({ data: notifRows });

  // ── 20–24. Új ERP modulok (kennel, foster, sponsorship, behavior, events) ──
  const newModuleStats = await seedNewModules({
    shelters:  shelters.map(s => ({ id: s.id, adminId: s.adminId })),
    allAnimals,
    allUsers,
  });

  return {
    users:          allUsers.length + 1 + SHELTER_NAMES.length,
    shelters:       shelters.length,
    animals:        animalRows.length,
    applications:   appRows.length,
    tiers:          tierRows.length,
    campaigns:      campaignRows.length,
    subscriptions:  subRows.length,
    donations:      donRows.length,
    reports:        reportRows.length,
    conversations:  convRecords.length,
    messages:       msgRows.length,
    healthRecords:  hrRows.length,
    reviews:        reviewRows.length,
    volunteers:     volRows.length,
    attendances:    attRows.length,
    tasks:          taskRows.length,
    appointments:   apptRows.length,
    followUps:      followUpRows.length,
    inventoryItems: invRows.length,
    transactions:   txRows.length,
    notifications:  notifRows.length,
    ...newModuleStats,
  };
}
