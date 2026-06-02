import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { AnimalType, AnimalSize, AnimalStatus, Role } from "@prisma/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-seed-token",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Csak SEED_SECRET tokennel hívható – soha ne hagyd publikusan nyitva!
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-seed-token");

  if (!process.env.SEED_SECRET || token !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SEED_IN_PROD) {
    return NextResponse.json(
      { error: "Seeding disabled in production. Set ALLOW_SEED_IN_PROD=true to override." },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  try {
    const result = await runSeed();
    return NextResponse.json({ success: true, ...result }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", detail: String(error) },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------
// Segédfüggvények
// -------------------------------------------------------

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomBool(p = 0.5) {
  return Math.random() < p;
}
const ANIMAL_IMAGE_KEYWORDS: Record<AnimalType, string> = {
  DOG: "dog", CAT: "cat", RABBIT: "rabbit", BIRD: "parrot", OTHER: "hamster",
};
function getAnimalImageUrl(type: AnimalType, seed: number): string {
  return `https://loremflickr.com/640/480/${ANIMAL_IMAGE_KEYWORDS[type]}?lock=${seed}`;
}
function slugify(text: string, suffix: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    suffix
  );
}

// -------------------------------------------------------
// Adatok
// -------------------------------------------------------

const CITIES = [
  "Budapest","Debrecen","Miskolc","Pécs","Győr",
  "Nyíregyháza","Kecskemét","Székesfehérvár","Szombathely","Érd",
  "Tatabánya","Kaposvár",
];

const SHELTER_NAMES = [
  "Mancs és Szív Állatvédők","Boldog Tappancs Menhely","Négy Láb Alapítvány",
  "Gazdira Vár Állatmenház","Állati Jó Hely","Hűséges Pata Menhely",
  "Szőrös Barátok Egyesület","Kapaszkodó Mancs Alapítvány","Örömtanya Állatvédők",
  "Kis Gömböc Menhely","Vidám Farok Állatvédelem","Remény Sziget Menhely",
];

const DOG_NAMES  = ["Bodri","Morzsa","Bundás","Fülöp","Dió","Makk","Csoki","Berci","Pötyi","Tappancs","Szikra","Manó","Bogár","Göndör","Pajkos","Ráró","Süni","Topsi","Virgonc","Rex"];
const CAT_NAMES  = ["Cica","Mimi","Cirmi","Tündér","Holdas","Éjfél","Narancs","Hópehely","Tigris","Selymes","Bolyhos","Párducka","Szürke","Fekete","Fehérke","Foltos","Csíkos","Kalapos","Luna","Misu"];
const DOG_BREEDS = ["Keverék","Labrador","Német juhász","Beagle","Golden Retriever","Husky","Rottweiler","Puli","Vizsla","Mudi","Pumi","Magyar Agár"];
const CAT_BREEDS = ["Keverék","Európai rövidszőrű","Maine Coon","Perzsa","Sziámi","Brit rövidszőrű","Ragdoll","Bengal"];
const COLORS     = ["fekete","fehér","barna","szürke","tarka","arany","vörös","foltos"];
const DESCS      = [
  "{name} egy kedves, játékos állat, aki szerető gazdira vár. Gyerekekkel és más állatokkal is jól kijön.",
  "{name} igazi csodaállat – engedelmes, tanulékony, és imádja az emberek társaságát.",
  "Menhely életéhez képest {name} nagyon kiegyensúlyozott. Türelmes, szeretne végre otthont kapni.",
  "{name} az egyik leghűségesebb lakónk. Minden nap reméli, hogy megtalálja új gazdáját.",
  "Szelíd és csendes természetű, {name} ideális lakótársa lenne egy nyugodt háztartásnak.",
];

// -------------------------------------------------------
// Seed logika
// -------------------------------------------------------

async function runSeed() {
  const adminPwd = await hash("Admin1234!", 10);
  const userPwd  = await hash("User1234!", 10);

  // Superadmin
  await prisma.user.upsert({
    where: { email: "admin@menhely.hu" },
    update: {},
    create: {
      name: "Rendszergazda", email: "admin@menhely.hu",
      password: adminPwd, role: Role.SUPER_ADMIN, emailVerified: new Date(),
    },
  });

  // Demo userek
  const users = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      prisma.user.upsert({
        where: { email: `user${i + 1}@example.com` },
        update: {},
        create: {
          name: `Teszt Felhasználó ${i + 1}`,
          email: `user${i + 1}@example.com`,
          password: userPwd, role: Role.USER,
          emailVerified: new Date(), city: randomItem(CITIES), country: "HU",
        },
      })
    )
  );

  // Menhelyek + állatok
  let animalCount = 0;
  let shelterCount = 0;

  for (let si = 0; si < SHELTER_NAMES.length; si++) {
    const name = SHELTER_NAMES[si];
    const city = CITIES[si % CITIES.length];
    const slug = slugify(name, String(si + 1));

    const adminEmail = `shelteradmin${si + 1}@menhely.hu`;
    const shelterAdmin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: `${name} Admin`, email: adminEmail,
        password: adminPwd, role: Role.SHELTER_ADMIN, emailVerified: new Date(),
      },
    });

    const shelter = await prisma.shelter.upsert({
      where: { slug },
      update: {},
      create: {
        name, slug, city, country: "HU",
        address: `Állatvédő utca ${randomInt(1, 50)}.`,
        zipCode: String(randomInt(1000, 9999)),
        phone: `+3630${randomInt(1000000, 9999999)}`,
        email: `info@${slug}.hu`,
        description: `${name} 2010 óta működik ${city}ban/ben.`,
        isVerified: randomBool(0.8), isActive: true,
      },
    });

    await prisma.shelterAdmin.upsert({
      where: { userId_shelterId: { userId: shelterAdmin.id, shelterId: shelter.id } },
      update: {},
      create: { userId: shelterAdmin.id, shelterId: shelter.id },
    });

    shelterCount++;

    // 8–20 állat per menhely
    for (let ai = 0; ai < randomInt(8, 20); ai++) {
      const isDog  = randomBool(0.55);
      const isCat  = !isDog && randomBool(0.7);
      const type   = isDog ? AnimalType.DOG : isCat ? AnimalType.CAT : AnimalType.OTHER;
      const names  = isDog ? DOG_NAMES : CAT_NAMES;
      const breeds = isDog ? DOG_BREEDS : CAT_BREEDS;
      const aname  = randomItem(names);
      const slug   = slugify(aname, `${shelter.id.slice(-4)}-${ai}`);
      const status = randomItem([
        AnimalStatus.AVAILABLE, AnimalStatus.AVAILABLE, AnimalStatus.AVAILABLE,
        AnimalStatus.PENDING, AnimalStatus.ADOPTED, AnimalStatus.FOSTER,
      ]);
      const arrivedAt = new Date(Date.now() - randomInt(7, 730) * 86400000);

      await prisma.animal.upsert({
        where: { slug },
        update: {},
        create: {
          shelterId: shelter.id, name: aname, slug, type,
          breed: type !== AnimalType.OTHER ? randomItem(breeds) : null,
          age: randomInt(2, 120), size: randomItem(Object.values(AnimalSize)),
          gender: randomItem(["MALE", "FEMALE"]),
          color: randomItem(COLORS), weight: parseFloat((randomInt(2, 40) + Math.random()).toFixed(1)),
          description: randomItem(DESCS).replace(/{name}/g, aname),
          isVaccinated: randomBool(0.75), isNeutered: randomBool(0.6),
          isMicrochipped: randomBool(0.7), isGoodWithKids: randomBool(0.65),
          isGoodWithDogs: randomBool(0.6), isGoodWithCats: randomBool(0.5),
          status, arrivedAt,
          adoptedAt: status === AnimalStatus.ADOPTED
            ? new Date(arrivedAt.getTime() + randomInt(14, 180) * 86400000) : null,
          images: {
            create: [{
              url: getAnimalImageUrl(type, animalCount),
              alt: `${aname} fotó`, isPrimary: true, order: 0,
            }],
          },
        },
      });
      animalCount++;
    }
  }

  // Örökbefogadási kérelmek
  // A reviewedAt (örökbefogadás dátuma) az állat tényleges adoptedAt-jéhez
  // igazodik, így a FactAdoption dátumai ~12 hónapra szétszóródnak – ettől
  // működik a Power BI idő-alapú trend (UC-01) és a stayDurationDays mérték.
  const pendingAnimals = await prisma.animal.findMany({
    where: { status: { in: [AnimalStatus.PENDING, AnimalStatus.ADOPTED] } },
    take: 400,
  });
  const nowMs = Date.now();
  let appCount = 0;
  for (const animal of pendingAnimals) {
    try {
      const isApproved = animal.status === AnimalStatus.ADOPTED;

      let createdAt: Date;
      let reviewedAt: Date | null;
      if (isApproved && animal.adoptedAt) {
        const adopted = Math.min(animal.adoptedAt.getTime(), nowMs);
        reviewedAt = new Date(adopted);
        createdAt  = new Date(adopted - randomInt(1, 21) * 86400000);
        if (animal.arrivedAt && createdAt < animal.arrivedAt) createdAt = new Date(animal.arrivedAt.getTime());
      } else {
        reviewedAt = null;
        createdAt  = new Date(nowMs - randomInt(1, 90) * 86400000);
      }

      await prisma.adoptionApplication.create({
        data: {
          userId: randomItem(users).id, animalId: animal.id,
          status: isApproved ? "APPROVED" : "PENDING",
          message: "Szeretném örökbefogadni. Házban élek, nagy kerttel.",
          homeType: randomItem(["HOUSE", "APARTMENT"]),
          hasGarden: randomBool(), hasChildren: randomBool(0.4), hasPets: randomBool(0.3),
          createdAt, reviewedAt,
        },
      });
      appCount++;
    } catch { /* unique constraint – skip */ }
  }

  return { shelters: shelterCount, animals: animalCount, applications: appCount };
}
