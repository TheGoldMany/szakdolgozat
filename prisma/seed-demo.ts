/**
 * Demo seed – Mancs Menhely Budapest
 *
 * Futtatás: npm run prisma:seed:demo
 *
 * Additive script: nem törli a meglévő adatokat.
 * Bejelentkezési adatok:
 *   Menhely admin:  demo@menhely.hu  / Demo1234!
 *   Demo userek:    user1@example.com .. user6@example.com / User1234!
 */

import {
  PrismaClient,
  AnimalType,
  AnimalSize,
  AnimalStatus,
  Role,
  ApplicationStatus,
  FollowUpStatus,
  HealthRecordType,
  AppointmentStatus,
  VolunteerStatus,
  InventoryCategory,
  InventoryTxType,
  CampaignStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const SHELTER_SLUG  = "mancs-menhely-budapest";
const ADMIN_EMAIL   = "demo@menhely.hu";
const ADMIN_PW      = "Demo1234!";
const USER_EMAILS   = Array.from({ length: 6 }, (_, i) => `user${i + 1}@example.com`);
const USER_PW       = "User1234!";

async function main() {
  console.log("🌱 Demo seed indítása – Mancs Menhely Budapest\n");

  // ── 1. Jelszavak ──────────────────────────────────────────────────────────
  const [adminPwHash, userPwHash] = await Promise.all([
    hash(ADMIN_PW, 10),
    hash(USER_PW,  10),
  ]);

  // ── 2. Demo menhely-admin felhasználó ─────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL },
    update: {},
    create: {
      name:          "Kovács Béla",
      email:         ADMIN_EMAIL,
      password:      adminPwHash,
      role:          Role.SHELTER_ADMIN,
      emailVerified: new Date(),
      phone:         "+36301234567",
      city:          "Budapest",
      country:       "HU",
    },
  });
  console.log(`✅ Admin: ${ADMIN_EMAIL}`);

  // ── 3. Demo sima felhasználók (upsert – ha már léteznek a nagy seedből) ──
  const upsertedUsers = await Promise.all(
    USER_EMAILS.map((email, i) =>
      prisma.user.upsert({
        where:  { email },
        update: {},
        create: {
          name:          `Teszt Felhasználó ${i + 1}`,
          email,
          password:      userPwHash,
          role:          Role.USER,
          emailVerified: new Date(),
          phone:         `+3620${String(7000000 + i).padStart(7, "0")}`,
          city:          "Budapest",
          country:       "HU",
        },
      }),
    ),
  );
  const [u1, u2, u3, u4, u5, u6] = upsertedUsers;
  console.log(`✅ ${upsertedUsers.length} demo user`);

  // ── 4. Menhely ────────────────────────────────────────────────────────────
  const shelter = await prisma.shelter.upsert({
    where:  { slug: SHELTER_SLUG },
    update: {},
    create: {
      name:        "Mancs Menhely Budapest",
      slug:        SHELTER_SLUG,
      description: "A Mancs Menhely Budapest 2008 óta működő nonprofit szervezet, amely fővárosi és agglomerációs kóbor, elhagyott vagy bántalmazott állatokat fogad be. Célunk minden gondozottnak biztonságos, szerető örökotthont találni.",
      address:     "Állatvédő utca 12.",
      city:        "Budapest",
      zipCode:     "1134",
      country:     "HU",
      phone:       "+3613334455",
      email:       "info@mancs-menhely.hu",
      website:     "https://mancs-menhely.hu",
      isVerified:  true,
      isActive:    true,
      capacity:    40,
      lat:         47.5093,
      lng:         19.0678,
    },
  });
  console.log(`✅ Menhely: ${shelter.name} (${shelter.id})`);

  // ── 5. ShelterAdmin kapcsolat ─────────────────────────────────────────────
  await prisma.shelterAdmin.upsert({
    where:  { userId_shelterId: { userId: adminUser.id, shelterId: shelter.id } },
    update: {},
    create: { userId: adminUser.id, shelterId: shelter.id },
  });

  // ── 6. Állatok ────────────────────────────────────────────────────────────
  type AnimalDef = {
    name: string; slug: string; type: AnimalType; breed: string;
    age: number; size: AnimalSize; gender: string; color: string;
    weight: number; description: string;
    isVaccinated: boolean; isNeutered: boolean; isMicrochipped: boolean;
    isGoodWithKids: boolean; isGoodWithDogs: boolean; isGoodWithCats: boolean;
    status: AnimalStatus; arrivedAt: Date; adoptedAt: Date | null;
  };

  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

  const animalDefs: AnimalDef[] = [
    {
      name: "Bodri", slug: `bodri-${shelter.id.slice(-6)}`,
      type: AnimalType.DOG, breed: "Labrador", age: 36, size: AnimalSize.LARGE,
      gender: "MALE", color: "sárga", weight: 28.5,
      description: "Bodri egy barátságos, energikus labrador. Gyerekekkel kiválóan kijön, más kutyákat szeret. Alapengedelmességre kiképzett.",
      isVaccinated: true, isNeutered: true, isMicrochipped: true,
      isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: false,
      status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(120), adoptedAt: null,
    },
    {
      name: "Rex", slug: `rex-${shelter.id.slice(-6)}`,
      type: AnimalType.DOG, breed: "Keverék", age: 60, size: AnimalSize.MEDIUM,
      gender: "MALE", color: "fekete-barna", weight: 18.0,
      description: "Rex idősebb kutya, de lelkesedéssel pótolja, amit a kor elvesz. Csendes lakókörnyezetbe, tapasztalt gazdához ajánljuk.",
      isVaccinated: true, isNeutered: true, isMicrochipped: true,
      isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: true,
      status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(200), adoptedAt: null,
    },
    {
      name: "Morzsa", slug: `morzsa-${shelter.id.slice(-6)}`,
      type: AnimalType.DOG, breed: "Puli", age: 24, size: AnimalSize.MEDIUM,
      gender: "FEMALE", color: "fekete", weight: 13.0,
      description: "Morzsa egy vidám, játékos puli kölyök. Kérelem beérkezett – jóváhagyásra vár.",
      isVaccinated: true, isNeutered: false, isMicrochipped: true,
      isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: true,
      status: AnimalStatus.PENDING, arrivedAt: daysAgo(90), adoptedAt: null,
    },
    {
      name: "Bundás", slug: `bundas-${shelter.id.slice(-6)}`,
      type: AnimalType.DOG, breed: "Vizsla", age: 48, size: AnimalSize.LARGE,
      gender: "MALE", color: "arany", weight: 24.0,
      description: "Bundás szerencsés – már megtalálta álomgazdáját! Aktív családhoz került.",
      isVaccinated: true, isNeutered: true, isMicrochipped: true,
      isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: false,
      status: AnimalStatus.ADOPTED, arrivedAt: daysAgo(365), adoptedAt: daysAgo(30),
    },
    {
      name: "Cica", slug: `cica-${shelter.id.slice(-6)}`,
      type: AnimalType.CAT, breed: "Brit rövidszőrű", age: 24, size: AnimalSize.MEDIUM,
      gender: "FEMALE", color: "szürke", weight: 4.2,
      description: "Cica egy kiegyensúlyozott, affektív macska. Lakásban szívesen él egyedül vagy más macskákkal.",
      isVaccinated: true, isNeutered: true, isMicrochipped: true,
      isGoodWithKids: true, isGoodWithDogs: false, isGoodWithCats: true,
      status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(80), adoptedAt: null,
    },
    {
      name: "Tündér", slug: `tunder-${shelter.id.slice(-6)}`,
      type: AnimalType.CAT, breed: "Keverék", age: 12, size: AnimalSize.SMALL,
      gender: "FEMALE", color: "fehér-narancssárga", weight: 2.8,
      description: "Tündér egy fiatal, játékos cicakölyök. Imádja a labdát és a csörgőjátékokat.",
      isVaccinated: true, isNeutered: false, isMicrochipped: false,
      isGoodWithKids: true, isGoodWithDogs: false, isGoodWithCats: true,
      status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(40), adoptedAt: null,
    },
    {
      name: "Cirmi", slug: `cirmi-${shelter.id.slice(-6)}`,
      type: AnimalType.CAT, breed: "Maine Coon", age: 36, size: AnimalSize.LARGE,
      gender: "MALE", color: "tarka", weight: 6.5,
      description: "Cirmi átmeneti gondozásnál van. Barátságos, de igényes – türelmes gazdára vár.",
      isVaccinated: true, isNeutered: true, isMicrochipped: true,
      isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: true,
      status: AnimalStatus.FOSTER, arrivedAt: daysAgo(150), adoptedAt: null,
    },
    {
      name: "Füles", slug: `fules-${shelter.id.slice(-6)}`,
      type: AnimalType.RABBIT, breed: "Holland törpe", age: 14, size: AnimalSize.SMALL,
      gender: "MALE", color: "fehér-szürke", weight: 1.2,
      description: "Füles egy aranyos Holland törpe nyuszi. Jól megszokja az embereket, szeret simogatást kapni.",
      isVaccinated: false, isNeutered: false, isMicrochipped: false,
      isGoodWithKids: true, isGoodWithDogs: false, isGoodWithCats: false,
      status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(55), adoptedAt: null,
    },
    {
      name: "Luna", slug: `luna-${shelter.id.slice(-6)}`,
      type: AnimalType.CAT, breed: "Keverék", age: 6, size: AnimalSize.SMALL,
      gender: "FEMALE", color: "fekete", weight: 1.8,
      description: "Luna kölyökcica, jelenleg állatorvosi megfigyelés alatt. Hamarosan örökbe adható lesz!",
      isVaccinated: false, isNeutered: false, isMicrochipped: false,
      isGoodWithKids: null as unknown as boolean, isGoodWithDogs: null as unknown as boolean, isGoodWithCats: null as unknown as boolean,
      status: AnimalStatus.MEDICAL_HOLD, arrivedAt: daysAgo(14), adoptedAt: null,
    },
    {
      name: "Max", slug: `max-${shelter.id.slice(-6)}`,
      type: AnimalType.DOG, breed: "Husky", age: 30, size: AnimalSize.LARGE,
      gender: "MALE", color: "szürke-fehér", weight: 25.0,
      description: "Max egy lenyűgöző szibériai husky. Aktív, mozgásszerető gazdát keres – futás, kerékpározás mellé ideális társ.",
      isVaccinated: true, isNeutered: false, isMicrochipped: true,
      isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: false,
      status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(60), adoptedAt: null,
    },
  ];

  const animals: Record<string, string> = {};
  for (const def of animalDefs) {
    const { slug, ...rest } = def;
    const animal = await prisma.animal.upsert({
      where:  { slug },
      update: {},
      create: { shelterId: shelter.id, slug, ...rest },
    });
    animals[def.name] = animal.id;
  }
  console.log(`✅ ${animalDefs.length} állat`);

  // ── 7. Állat képek ────────────────────────────────────────────────────────
  const IMG: Record<AnimalType, string> = {
    DOG: "dog", CAT: "cat", RABBIT: "rabbit", BIRD: "parrot", OTHER: "hamster",
  };
  const imgSeeds: Record<string, { type: AnimalType; seed: number }> = {
    "Bodri": { type: AnimalType.DOG,    seed: 101 },
    "Rex":   { type: AnimalType.DOG,    seed: 102 },
    "Morzsa":{ type: AnimalType.DOG,    seed: 103 },
    "Bundás":{ type: AnimalType.DOG,    seed: 104 },
    "Cica":  { type: AnimalType.CAT,    seed: 201 },
    "Tündér":{ type: AnimalType.CAT,    seed: 202 },
    "Cirmi": { type: AnimalType.CAT,    seed: 203 },
    "Füles": { type: AnimalType.RABBIT, seed: 301 },
    "Luna":  { type: AnimalType.CAT,    seed: 204 },
    "Max":   { type: AnimalType.DOG,    seed: 105 },
  };
  for (const [name, { type, seed }] of Object.entries(imgSeeds)) {
    const animalId = animals[name];
    if (!animalId) continue;
    const existing = await prisma.animalImage.findFirst({ where: { animalId, isPrimary: true } });
    if (!existing) {
      await prisma.animalImage.create({
        data: {
          animalId,
          url:       `https://loremflickr.com/640/480/${IMG[type]}?lock=${seed}`,
          alt:       `${name} fotó`,
          isPrimary: true,
          order:     0,
        },
      });
    }
  }
  console.log("✅ Állat képek");

  // ── 8. Egészségügyi bejegyzések ───────────────────────────────────────────
  type HrDef = { animalName: string; type: HealthRecordType; title: string; description: string; date: Date; nextDueDate?: Date; vetName: string };
  const hrDefs: HrDef[] = [
    {
      animalName: "Bodri", type: HealthRecordType.VACCINATION,
      title: "Veszettség elleni oltás", vetName: "Dr. Nagy Péter",
      description: "Éves veszettség elleni oltás + kombinált (Nobivac DHPPi+L4).",
      date: daysAgo(30), nextDueDate: new Date(Date.now() + 335 * 86_400_000),
    },
    {
      animalName: "Rex", type: HealthRecordType.CHECKUP,
      title: "Éves szűrővizsgálat", vetName: "Dr. Kiss Anna",
      description: "Általános egészségügyi szűrés. Fogkő-eltávolítás elvégezve. Egyéb eltérés nem tapasztalható.",
      date: daysAgo(60),
    },
    {
      animalName: "Morzsa", type: HealthRecordType.DEWORMING,
      title: "Féregtelenítés", vetName: "Dr. Nagy Péter",
      description: "Milbemax tabletta (2×1 db). Következő: 3 hónap múlva.",
      date: daysAgo(14), nextDueDate: new Date(Date.now() + 76 * 86_400_000),
    },
    {
      animalName: "Luna", type: HealthRecordType.TREATMENT,
      title: "Felső légúti fertőzés kezelése", vetName: "Dr. Kiss Anna",
      description: "Amoxicillin 50 mg / 10 nap. Kölyöckori catfluenzának megfelelő tünetek. Elkülönítés szükséges.",
      date: daysAgo(10), nextDueDate: new Date(Date.now() + 4 * 86_400_000),
    },
    {
      animalName: "Max", type: HealthRecordType.VACCINATION,
      title: "Kennel kóhogás oltás", vetName: "Dr. Nagy Péter",
      description: "Nobivac KC intranasal. Érvényes 12 hónapig.",
      date: daysAgo(45), nextDueDate: new Date(Date.now() + 320 * 86_400_000),
    },
  ];

  for (const def of hrDefs) {
    const animalId = animals[def.animalName];
    if (!animalId) continue;
    const existing = await prisma.healthRecord.findFirst({
      where: { animalId, title: def.title, date: def.date },
    });
    if (!existing) {
      await prisma.healthRecord.create({
        data: {
          animalId,
          type:        def.type,
          title:       def.title,
          description: def.description,
          date:        def.date,
          nextDueDate: def.nextDueDate ?? null,
          vetName:     def.vetName,
          createdById: adminUser.id,
        },
      });
    }
  }
  console.log("✅ Egészségügyi bejegyzések");

  // ── 9. Készlettételek ─────────────────────────────────────────────────────
  type InvDef = {
    name: string; category: InventoryCategory; unit: string;
    quantity: number; minQuantity?: number; note?: string; expiresAt?: Date;
  };
  const invDefs: InvDef[] = [
    {
      name: "Royal Canin Adult Medium",
      category: InventoryCategory.FOOD, unit: "kg",
      quantity: 48, minQuantity: 10,
      note: "Felnőtt közepes fajtájú kutyáknak",
    },
    {
      name: "Antibiotikum (Amoxicillin 50 mg)",
      category: InventoryCategory.MEDICINE, unit: "tabletta",
      quantity: 8, minQuantity: 20,
      note: "Alacsony készlet! Rendelni kell.",
    },
    {
      name: "Kölyöktáp (Hill's Science Plan Puppy)",
      category: InventoryCategory.FOOD, unit: "kg",
      quantity: 15, minQuantity: 5,
    },
    {
      name: "Vitamin cseppek (Beaphar Multivit)",
      category: InventoryCategory.MEDICINE, unit: "üveg",
      quantity: 2, minQuantity: 1,
      expiresAt: new Date(Date.now() + 5 * 86_400_000),
      note: "Hamarosan lejár – felhasználni vagy rendelni!",
    },
    {
      name: "Fertőtlenítő spray (Virkon S)",
      category: InventoryCategory.CLEANING, unit: "liter",
      quantity: 3, minQuantity: 6,
      note: "Alacsony készlet.",
    },
    {
      name: "Pórázok (vegyes méret)",
      category: InventoryCategory.SUPPLIES, unit: "db",
      quantity: 12,
    },
    {
      name: "Macska homok (Catsan)",
      category: InventoryCategory.SUPPLIES, unit: "kg",
      quantity: 40, minQuantity: 15,
    },
    {
      name: "Kutyaágy / szivacsmatrac",
      category: InventoryCategory.EQUIPMENT, unit: "db",
      quantity: 22,
      note: "Felnőtt közepes / nagy méret",
    },
    {
      name: "Cicaalom tálca",
      category: InventoryCategory.EQUIPMENT, unit: "db",
      quantity: 10, minQuantity: 5,
    },
    {
      name: "Mosószer (Persil, illatmentes)",
      category: InventoryCategory.CLEANING, unit: "kg",
      quantity: 6, minQuantity: 2,
    },
  ];

  const invItems: Record<string, string> = {};
  for (const def of invDefs) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { shelterId: shelter.id, name: def.name },
    });
    if (existing) {
      invItems[def.name] = existing.id;
      continue;
    }
    const item = await prisma.inventoryItem.create({
      data: {
        shelterId:   shelter.id,
        name:        def.name,
        category:    def.category,
        unit:        def.unit,
        quantity:    def.quantity,
        minQuantity: def.minQuantity ?? null,
        expiresAt:   def.expiresAt ?? null,
        note:        def.note ?? null,
      },
    });
    invItems[def.name] = item.id;

    if (def.quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          itemId:      item.id,
          type:        InventoryTxType.IN,
          quantity:    def.quantity,
          note:        "Nyitókészlet",
          createdById: adminUser.id,
        },
      });
    }
  }
  console.log(`✅ ${invDefs.length} készlettétel`);

  // Néhány extra tranzakció az előzmény-listához
  const rcId  = invItems["Royal Canin Adult Medium"];
  const abId  = invItems["Antibiotikum (Amoxicillin 50 mg)"];
  const vitId = invItems["Vitamin cseppek (Beaphar Multivit)"];

  if (rcId) {
    const txExists = await prisma.inventoryTransaction.findFirst({
      where: { itemId: rcId, type: InventoryTxType.OUT, note: "Heti adagolás" },
    });
    if (!txExists) {
      await prisma.inventoryTransaction.create({
        data: { itemId: rcId, type: InventoryTxType.OUT, quantity: -7, note: "Heti adagolás", createdById: adminUser.id },
      });
      await prisma.inventoryTransaction.create({
        data: { itemId: rcId, type: InventoryTxType.OUT, quantity: -7, note: "Heti adagolás", createdById: adminUser.id, createdAt: daysAgo(7) },
      });
    }
  }
  if (abId) {
    const txExists = await prisma.inventoryTransaction.findFirst({
      where: { itemId: abId, type: InventoryTxType.OUT, note: "Luna kezelése" },
    });
    if (!txExists) {
      await prisma.inventoryTransaction.create({
        data: { itemId: abId, type: InventoryTxType.OUT, quantity: -20, note: "Luna kezelése (10 napos kúra)", createdById: adminUser.id, createdAt: daysAgo(10) },
      });
    }
  }
  if (vitId) {
    const txExists = await prisma.inventoryTransaction.findFirst({
      where: { itemId: vitId, type: InventoryTxType.ADJUST },
    });
    if (!txExists) {
      await prisma.inventoryTransaction.create({
        data: { itemId: vitId, type: InventoryTxType.ADJUST, quantity: -1, note: "Leltári korrekció – 1 üveg eltört", createdById: adminUser.id, createdAt: daysAgo(5) },
      });
    }
  }

  // ── 10. Adományozási szintek ──────────────────────────────────────────────
  const tierDefs = [
    { name: "Alapcsomag", amount: 1000,  description: "Havi 1 000 Ft-tal egy kisállat ételéhez járulsz hozzá." },
    { name: "Barát",      amount: 2500,  description: "Havi 2 500 Ft – egy gondozottunk heti ellátásának fele." },
    { name: "Védnök",     amount: 5000,  description: "Havi 5 000 Ft-os védnökség. Neveddel dicsekedhetünk!" },
    { name: "Nagylelkű",  amount: 10000, description: "Havi 10 000 Ft – igazi mentőangyal vagy. Köszönjük!" },
  ];
  const tierIds: Record<string, string> = {};
  for (const def of tierDefs) {
    const existing = await prisma.donationTier.findFirst({
      where: { shelterId: shelter.id, name: def.name },
    });
    if (existing) { tierIds[def.name] = existing.id; continue; }
    const tier = await prisma.donationTier.create({
      data: { shelterId: shelter.id, ...def, isActive: true },
    });
    tierIds[def.name] = tier.id;
  }
  console.log("✅ Adományozási szintek");

  // Előfizetés user1 → Barát
  const baratId = tierIds["Barát"];
  if (baratId) {
    const subExists = await prisma.subscription.findFirst({
      where: { userId: u1.id, tierId: baratId },
    });
    if (!subExists) {
      await prisma.subscription.create({
        data: { userId: u1.id, tierId: baratId, status: "ACTIVE" },
      });
    }
  }
  console.log("✅ Előfizetés (user1 → Barát)");

  // ── 11. Kampány ───────────────────────────────────────────────────────────
  const campSlug = `teli-takarmany-osszefogasmancs-${shelter.id.slice(-6)}`;
  const campExists = await prisma.campaign.findUnique({ where: { slug: campSlug } });
  if (!campExists) {
    await prisma.campaign.create({
      data: {
        userId:       adminUser.id,
        shelterId:    shelter.id,
        title:        "Téli takarmány összefogás",
        slug:         campSlug,
        description:  "Télen állataink ételszükséglete megnő. Segíts feltölteni a készletet! Célunk 500 000 Ft összegyűjtése takarmányra és gyógyszerekre.",
        targetAmount: 500_000,
        raisedAmount: 125_000,
        status:       CampaignStatus.ACTIVE,
        endsAt:       new Date(Date.now() + 60 * 86_400_000),
      },
    });
  }
  console.log("✅ Kampány: Téli takarmány összefogás");

  // ── 12. Önkéntesek ────────────────────────────────────────────────────────
  const volDefs = [
    {
      user: u2, status: VolunteerStatus.ACTIVE,
      motivation: "Gyerekkorom óta szeretek állatokkal foglalkozni. Hétvégenként szívesen segítek.",
      skills: "Sétáltatás, szocializáció, fotózás",
      availability: "Szombat, vasárnap",
    },
    {
      user: u3, status: VolunteerStatus.PENDING,
      motivation: "Nemrég költöztem Budapestre, és szeretnék hasznos lenni a közösség számára.",
      skills: "Adminisztráció, közösségi média",
      availability: "Hétköznaponként este",
    },
    {
      user: u6, status: VolunteerStatus.ACTIVE,
      motivation: "Állatjogász vagyok – jogi tanácsadással és fundraisinggel segítenék.",
      skills: "Jogi tanácsadás, adománygyűjtés",
      availability: "Rugalmas",
    },
  ];
  for (const def of volDefs) {
    const existing = await prisma.volunteer.findUnique({
      where: { userId_shelterId: { userId: def.user.id, shelterId: shelter.id } },
    });
    if (!existing) {
      const vol = await prisma.volunteer.create({
        data: {
          userId:       def.user.id,
          shelterId:    shelter.id,
          status:       def.status,
          motivation:   def.motivation,
          skills:       def.skills,
          availability: def.availability,
        },
      });
      if (def.status === VolunteerStatus.ACTIVE) {
        await prisma.volunteerAttendance.create({
          data: { volunteerId: vol.id, date: daysAgo(7), hours: 4, note: "Sétáltatás + takarítás" },
        });
      }
    }
  }
  console.log("✅ Önkéntesek");

  // ── 13. Örökbefogadási kérelmek ───────────────────────────────────────────
  // u4 → Morzsa (PENDING)
  const morzsaId = animals["Morzsa"];
  if (morzsaId) {
    const appExists = await prisma.adoptionApplication.findUnique({
      where: { userId_animalId: { userId: u4.id, animalId: morzsaId } },
    });
    if (!appExists) {
      await prisma.adoptionApplication.create({
        data: {
          userId:      u4.id,
          animalId:    morzsaId,
          status:      ApplicationStatus.PENDING,
          message:     "Szeretném örökbefogadni Mozrsát. Kertes házban élünk, van udvari futtatónk. Már tartottunk pulit korábban.",
          homeType:    "HOUSE",
          hasGarden:   true,
          hasChildren: false,
          hasPets:     false,
          experience:  "10+ év kutyatartási tapasztalat, korábbi kutyám szintén puli volt.",
          createdAt:   daysAgo(12),
        },
      });
    }
  }

  // u5 → Cica (REVIEWING)
  const cicaId = animals["Cica"];
  if (cicaId) {
    const appExists = await prisma.adoptionApplication.findUnique({
      where: { userId_animalId: { userId: u5.id, animalId: cicaId } },
    });
    if (!appExists) {
      await prisma.adoptionApplication.create({
        data: {
          userId:      u5.id,
          animalId:    cicaId,
          status:      ApplicationStatus.REVIEWING,
          message:     "Cicát keresek lakótársnak. Nappal egyedül tartózkodnék, de reggel-este sok időm van rá.",
          homeType:    "APARTMENT",
          hasGarden:   false,
          hasChildren: false,
          hasPets:     false,
          experience:  "Először tartanék macskát, de sokat olvastam a gondozásukról.",
          createdAt:   daysAgo(20),
          reviewedAt:  daysAgo(10),
        },
      });
    }
  }

  // u1 → Bundás (APPROVED) + follow-up
  const bundasId = animals["Bundás"];
  if (bundasId) {
    const appExists = await prisma.adoptionApplication.findUnique({
      where: { userId_animalId: { userId: u1.id, animalId: bundasId } },
    });
    let appId = appExists?.id;
    if (!appExists) {
      const app = await prisma.adoptionApplication.create({
        data: {
          userId:      u1.id,
          animalId:    bundasId,
          status:      ApplicationStatus.APPROVED,
          message:     "Bundást szeretnénk örökbefogadni. Kertes házban élünk Budaörsön, van egy 6 éves fiunk.",
          homeType:    "HOUSE",
          hasGarden:   true,
          hasChildren: true,
          hasPets:     false,
          experience:  "Gyerekkorunkban volt kutyánk, de saját felelősségeként most lenne az első.",
          reviewNotes: "Személyes bemutatkozó megtörtént. Ideális gazdik, ajánlott.",
          createdAt:   daysAgo(60),
          reviewedAt:  daysAgo(45),
        },
      });
      appId = app.id;
    }
    if (appId) {
      const fuExists = await prisma.adoptionFollowUp.findFirst({ where: { applicationId: appId } });
      if (!fuExists) {
        await prisma.adoptionFollowUp.create({
          data: {
            applicationId: appId,
            scheduledAt:   daysAgo(0),
            completedAt:   daysAgo(0),
            wellbeing:     5,
            notes:         "Bundás remekül alkalmazkodott az új otthonhoz. Imádja a gyereket, minden nap sétálnak.",
            status:        FollowUpStatus.COMPLETED,
          },
        });
        await prisma.adoptionFollowUp.create({
          data: {
            applicationId: appId,
            scheduledAt:   new Date(Date.now() + 60 * 86_400_000),
            status:        FollowUpStatus.PENDING,
          },
        });
      }
    }
  }
  console.log("✅ Örökbefogadási kérelmek + utánkövetések");

  // ── 14. Értékelések ───────────────────────────────────────────────────────
  type ReviewDef = { authorId: string; rating: number; comment?: string };
  const reviewDefs: ReviewDef[] = [
    { authorId: u1.id, rating: 5, comment: "Fantasztikus csapat! Bundásnak tökéletes otthont találtak nekünk. Folyamatos támogatást nyújtottak az örökbefogadás után is." },
    { authorId: u2.id, rating: 4, comment: "Nagyon segítőkész személyzet. Az önkéntes program jól szervezett. Egy csillagot azért vonok le, mert a nyitvatartásuk néha nehezen kiszámítható." },
    { authorId: u5.id, rating: 5, comment: "Profi, gondoskodó csapat. A kérelem folyamata átlátható volt és gyors visszajelzéseket kaptam." },
  ];
  for (const def of reviewDefs) {
    const existing = await prisma.review.findFirst({
      where: { authorId: def.authorId, shelterId: shelter.id },
    });
    if (!existing) {
      await prisma.review.create({
        data: { authorId: def.authorId, shelterId: shelter.id, rating: def.rating, comment: def.comment ?? null },
      });
    }
  }
  console.log("✅ Értékelések");

  // ── 15. Időpontok ─────────────────────────────────────────────────────────
  const aptDefs = [
    {
      user: u4, animalName: "Morzsa", status: AppointmentStatus.CONFIRMED,
      proposedAt: new Date(Date.now() + 3 * 86_400_000),
      confirmedAt: new Date(Date.now() + 3 * 86_400_000),
      note: "Szeretném személyesen megismerni Mozrsát. Szombat délelőtt megfelelne.",
      adminNote: "Visszaigazolva – szombat 10:00 óra.",
    },
    {
      user: u6, animalName: "Bodri", status: AppointmentStatus.PENDING,
      proposedAt: new Date(Date.now() + 5 * 86_400_000),
      note: "Hétfőn délután fél 4 körül mennék. Bodrit szeretném látni.",
    },
  ];
  for (const def of aptDefs) {
    const animalId = animals[def.animalName] ?? null;
    const existing = await prisma.appointment.findFirst({
      where: { userId: def.user.id, shelterId: shelter.id, animalId },
    });
    if (!existing) {
      await prisma.appointment.create({
        data: {
          shelterId:   shelter.id,
          userId:      def.user.id,
          animalId,
          status:      def.status,
          proposedAt:  def.proposedAt,
          confirmedAt: def.confirmedAt ?? null,
          note:        def.note ?? null,
          adminNote:   def.adminNote ?? null,
        },
      });
    }
  }
  console.log("✅ Időpontfoglalások");

  // ── Összefoglalás ─────────────────────────────────────────────────────────
  console.log("\n🎉 Demo seed kész!\n");
  console.log("   Menhely:     Mancs Menhely Budapest");
  console.log(`   Menhely ID:  ${shelter.id}`);
  console.log("   Admin login: demo@menhely.hu / Demo1234!");
  console.log("   Demo userek: user1@example.com .. user6@example.com / User1234!\n");
  console.log("   Állapotok:");
  console.log("     • 5 AVAILABLE állat (Bodri, Rex, Cica, Tündér, Füles, Max)");
  console.log("     • 1 PENDING (Morzsa – kérelem beérkezett)");
  console.log("     • 1 ADOPTED (Bundás – utánkövetéssel)");
  console.log("     • 1 FOSTER  (Cirmi – átmeneti gondozás)");
  console.log("     • 1 MEDICAL_HOLD (Luna – állatorvosi megfigyelés)");
  console.log("   Készlet:");
  console.log("     • 2 alacsony készlet: Antibiotikum, Fertőtlenítő spray");
  console.log("     • 1 hamarosan lejár:  Vitamin cseppek (5 nap)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
