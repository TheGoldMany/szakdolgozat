import { PrismaClient, AnimalType, AnimalSize, AnimalStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// -------------------------------------------------------
// Segédfüggvények
// -------------------------------------------------------

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(trueProbability = 0.5) {
  return Math.random() < trueProbability;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const ANIMAL_IMAGE_KEYWORDS: Record<AnimalType, string> = {
  DOG:    "dog",
  CAT:    "cat",
  RABBIT: "rabbit",
  BIRD:   "parrot",
  OTHER:  "hamster",
};

function getAnimalImageUrl(type: AnimalType, seed: number): string {
  const keyword = ANIMAL_IMAGE_KEYWORDS[type];
  return `https://loremflickr.com/640/480/${keyword}?lock=${seed}`;
}

// -------------------------------------------------------
// Adatok
// -------------------------------------------------------

const CITIES = [
  { name: "Budapest", county: "Budapest" },
  { name: "Debrecen", county: "Hajdú-Bihar" },
  { name: "Miskolc", county: "Borsod-Abaúj-Zemplén" },
  { name: "Pécs", county: "Baranya" },
  { name: "Győr", county: "Győr-Moson-Sopron" },
  { name: "Nyíregyháza", county: "Szabolcs-Szatmár-Bereg" },
  { name: "Kecskemét", county: "Bács-Kiskun" },
  { name: "Székesfehérvár", county: "Fejér" },
  { name: "Szombathely", county: "Vas" },
  { name: "Érd", county: "Pest" },
  { name: "Tatabánya", county: "Komárom-Esztergom" },
  { name: "Kaposvár", county: "Somogy" },
];

const SHELTER_NAMES = [
  "Mancs és Szív Állatvédők",
  "Boldog Tappancs Menhely",
  "Négy Láb Alapítvány",
  "Gazdira Vár Állatmenház",
  "Állati Jó Hely",
  "Hűséges Pata Menhely",
  "Szőrös Barátok Egyesület",
  "Kapaszkodó Mancs Alapítvány",
  "Örömtanya Állatvédők",
  "Kis Gömböc Menhely",
  "Vidám Farok Állatvédelem",
  "Remény Sziget Menhely",
];

const DOG_NAMES = [
  "Bodri", "Morzsa", "Bundás", "Fülöp", "Dió", "Makk", "Csoki",
  "Berci", "Pötyi", "Tappancs", "Szikra", "Manó", "Bogár", "Cirmi",
  "Göndör", "Pajkos", "Ráró", "Süni", "Topsi", "Virgonc",
];

const CAT_NAMES = [
  "Cica", "Macska", "Mimi", "Cirmi", "Tündér", "Holdas", "Éjfél",
  "Narancs", "Hópehely", "Tigris", "Lázár", "Selymes", "Bolyhos",
  "Párducka", "Szürke", "Fekete", "Fehérke", "Foltos", "Csíkos", "Kalapos",
];

const DOG_BREEDS = [
  "Keverék", "Labrador", "Német juhász", "Beagle", "Golden Retriever",
  "Husky", "Rottweiler", "Puli", "Vizsla", "Mudi", "Pumi",
  "Magyar Agár", "Erdélyi Kopó",
];

const CAT_BREEDS = [
  "Keverék", "Európai rövidszőrű", "Maine Coon", "Perzsa", "Sziámi",
  "Brit rövidszőrű", "Ragdoll", "Bengal", "Norvég erdei",
];

const ANIMAL_DESCRIPTIONS = [
  "Kedves, játékos {name} szerető gazdira vár! Gyerekekkel és más állatokkal is jól kijön.",
  "{name} egy igazi csodaállat – engedelmes, tanulékony, és imádja az emberek társaságát.",
  "Menhely életéhez képest {name} nagyon kiegyensúlyozott. Türelmes, szeretne végre otthont kapni.",
  "{name} az egyik leghűségesebb lakónk. Minden nap reméli, hogy megtalálja új gazdáját.",
  "Szelíd és csendes természetű, {name} ideális lakótársa lenne egy nyugodt háztartásnak.",
  "{name} imádja a sétákat, a játékot, és persze a cicózásokat. Rengeteg szeretetet ad vissza!",
];

// -------------------------------------------------------
// Seed
// -------------------------------------------------------

async function main() {
  console.log("🌱 Seed adatok betöltése...");

  // ------ Superadmin ------
  const adminPassword = await hash("Admin1234!", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@menhely.hu" },
    update: {},
    create: {
      name: "Rendszergazda",
      email: "admin@menhely.hu",
      password: adminPassword,
      role: Role.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Superadmin létrehozva:", superAdmin.email);

  // ------ Demo felhasználók ------
  const userPassword = await hash("User1234!", 10);
  const demoUsers = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      prisma.user.upsert({
        where: { email: `user${i + 1}@example.com` },
        update: {},
        create: {
          name: `Teszt Felhasználó ${i + 1}`,
          email: `user${i + 1}@example.com`,
          password: userPassword,
          role: Role.USER,
          emailVerified: new Date(),
          phone: `+3630${randomInt(1000000, 9999999)}`,
          city: randomItem(CITIES).name,
          country: "HU",
        },
      })
    )
  );
  console.log(`✅ ${demoUsers.length} demo felhasználó létrehozva`);

  // ------ Menhelyek ------
  const shelters = await Promise.all(
    SHELTER_NAMES.map(async (name, i) => {
      const city = CITIES[i % CITIES.length];
      const slug = slugify(name) + `-${i + 1}`;

      // Shelter admin user
      const adminEmail = `shelteradmin${i + 1}@menhely.hu`;
      const shelterAdmin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
          name: `${name} – Admin`,
          email: adminEmail,
          password: adminPassword,
          role: Role.SHELTER_ADMIN,
          emailVerified: new Date(),
        },
      });

      const shelter = await prisma.shelter.upsert({
        where: { slug },
        update: {},
        create: {
          name,
          slug,
          description: `${name} 2010 óta működik ${city.name}ban. Célunk az örökbefogadható állatok gondozása és új otthonba juttatása.`,
          address: `Állatvédő utca ${randomInt(1, 50)}.`,
          city: city.name,
          zipCode: String(randomInt(1000, 9999)),
          country: "HU",
          phone: `+3630${randomInt(1000000, 9999999)}`,
          email: `info@${slug}.hu`,
          website: `https://${slug}.hu`,
          isVerified: randomBool(0.8),
          isActive: true,
        },
      });

      await prisma.shelterAdmin.upsert({
        where: { userId_shelterId: { userId: shelterAdmin.id, shelterId: shelter.id } },
        update: {},
        create: { userId: shelterAdmin.id, shelterId: shelter.id },
      });

      return shelter;
    })
  );
  console.log(`✅ ${shelters.length} menhely létrehozva`);

  // ------ Állatok ------
  let animalCount = 0;

  for (const shelter of shelters) {
    const animalNum = randomInt(8, 20);

    for (let i = 0; i < animalNum; i++) {
      const isDog = randomBool(0.55);
      const isCat = !isDog && randomBool(0.7);
      const type = isDog ? AnimalType.DOG : isCat ? AnimalType.CAT : AnimalType.OTHER;

      const names = isDog ? DOG_NAMES : CAT_NAMES;
      const breeds = isDog ? DOG_BREEDS : CAT_BREEDS;
      const name = randomItem(names);
      const baseSlug = slugify(name);
      const slug = `${baseSlug}-${shelter.id.slice(-6)}-${i}`;

      const ageMonths = randomInt(2, 120);
      const status = randomItem([
        AnimalStatus.AVAILABLE,
        AnimalStatus.AVAILABLE,
        AnimalStatus.AVAILABLE,
        AnimalStatus.PENDING,
        AnimalStatus.ADOPTED,
        AnimalStatus.FOSTER,
        AnimalStatus.MEDICAL_HOLD,
      ]);

      const descTemplate = randomItem(ANIMAL_DESCRIPTIONS);
      const description = descTemplate.replace(/{name}/g, name);

      const arrivedAt = new Date(
        Date.now() - randomInt(7, 365) * 24 * 60 * 60 * 1000
      );

      await prisma.animal.upsert({
        where: { slug },
        update: {},
        create: {
          shelterId: shelter.id,
          name,
          slug,
          type,
          breed: type !== AnimalType.OTHER ? randomItem(breeds) : null,
          age: ageMonths,
          size: randomItem([AnimalSize.SMALL, AnimalSize.MEDIUM, AnimalSize.LARGE, AnimalSize.EXTRA_LARGE]),
          gender: randomItem(["MALE", "FEMALE"]),
          color: randomItem(["fekete", "fehér", "barna", "szürke", "tarka", "arany", "vörös"]),
          weight: parseFloat((randomInt(2, 40) + Math.random()).toFixed(1)),
          description,
          isVaccinated: randomBool(0.75),
          isNeutered: randomBool(0.6),
          isMicrochipped: randomBool(0.7),
          isGoodWithKids: randomBool(0.65),
          isGoodWithDogs: randomBool(0.6),
          isGoodWithCats: randomBool(0.5),
          status,
          arrivedAt,
          adoptedAt: status === AnimalStatus.ADOPTED
            ? new Date(arrivedAt.getTime() + randomInt(14, 180) * 24 * 60 * 60 * 1000)
            : null,
          images: {
            create: [
              {
                url: getAnimalImageUrl(type, animalCount),
                alt: `${name} fotó`,
                isPrimary: true,
                order: 0,
              },
            ],
          },
        },
      });

      animalCount++;
    }
  }
  console.log(`✅ ${animalCount} állat létrehozva`);

  // ------ Örökbefogadási kérelmek ------
  const animals = await prisma.animal.findMany({
    where: { status: { in: [AnimalStatus.PENDING, AnimalStatus.ADOPTED] } },
    take: 30,
  });

  let appCount = 0;
  for (const animal of animals) {
    const user = randomItem(demoUsers);
    try {
      await prisma.adoptionApplication.create({
        data: {
          userId: user.id,
          animalId: animal.id,
          status: animal.status === AnimalStatus.ADOPTED ? "APPROVED" : "PENDING",
          message: "Szeretném örökbefogadni ezt az állatot. Házban élek, nagy kerttel.",
          homeType: randomItem(["HOUSE", "APARTMENT"]),
          hasGarden: randomBool(0.5),
          hasChildren: randomBool(0.4),
          hasPets: randomBool(0.3),
          experience: "Volt már korábban kutyám/macskám, szívesen vállalom a gondozást.",
        },
      });
      appCount++;
    } catch {
      // unique constraint – skip
    }
  }
  console.log(`✅ ${appCount} örökbefogadási kérelem létrehozva`);

  console.log("\n🎉 Seed kész!");
  console.log("   Superadmin:   admin@menhely.hu / Admin1234!");
  console.log("   Demo user:    user1@example.com / User1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
