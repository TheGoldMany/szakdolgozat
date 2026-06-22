import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import {
  AnimalType, AnimalSize, AnimalStatus, Role,
  ApplicationStatus, CampaignStatus, EventType, EventStatus,
  InventoryCategory, InventoryTxType, VolunteerStatus, HealthRecordType,
} from "@prisma/client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TOKEN = "a968a357c1697d7567dcb4a897f022f8c5e7ae03";
const SHELTER_PW = "Shelter1234!";
const USER_PW = "Preview1234!";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
    const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

    // 1. Truncate all tables
    await prisma.$executeRawUnsafe(`
      TRUNCATE
        "FeedingLog","FeedingSchedule","AnimalTransfer","EventRegistration","Event",
        "FosterSupplyLog","FosterProfile","InventoryTransaction","InventoryItem",
        "Notification","VolunteerAttendance","VolunteerTaskAssignment","VolunteerTask","Volunteer",
        "Appointment","HealthRecord","Review","FormFieldResponse","FormField","ApplicationForm",
        "Donation","Campaign","Subscription","DonationTier","Message","Conversation",
        "ReportMatch","ReportImage","AnimalReport","Favorite","AdoptionFollowUp",
        "AdoptionApplication","AnimalImage","AnimalDocument","BehaviorLog","Kennel",
        "Sponsorship","Animal","ShelterDocument","ShelterAdmin","Shelter",
        "VerificationToken","Session","Account","PasswordResetToken","User"
      RESTART IDENTITY CASCADE
    `);

    // 2. Hash passwords
    const [shelterHash, userHash] = await Promise.all([
      hash(SHELTER_PW, 10),
      hash(USER_PW, 10),
    ]);

    // 3. Shelter admin users
    const adminNames = [
      { name: "Kovács Béla",    email: "kovacs.bela@mancs.hu" },
      { name: "Nagy Zsófia",    email: "nagy.zsofia@paca.hu" },
      { name: "Horváth Péter",  email: "horvath.peter@baranya.hu" },
      { name: "Tóth Katalin",   email: "toth.katalin@rabca.hu" },
      { name: "Varga Gábor",    email: "varga.gabor@bukki.hu" },
    ];
    const shelterAdmins = await Promise.all(
      adminNames.map(d => prisma.user.create({
        data: { ...d, password: shelterHash, role: Role.SHELTER_ADMIN, emailVerified: new Date(), emailNotifications: true, country: "HU" },
      }))
    );

    // 4. Regular users (15)
    const userNames = [
      { name: "Szabó Erzsébet",   email: "szabo.erzsebet@preview.hu",   city: "Budapest" },
      { name: "Kiss Dániel",      email: "kiss.daniel@preview.hu",       city: "Debrecen" },
      { name: "Molnár Judit",     email: "molnar.judit@preview.hu",      city: "Pécs" },
      { name: "Fekete Levente",   email: "fekete.levente@preview.hu",    city: "Győr" },
      { name: "Balogh Ágnes",     email: "balogh.agnes@preview.hu",      city: "Miskolc" },
      { name: "Papp Zoltán",      email: "papp.zoltan@preview.hu",       city: "Budapest" },
      { name: "Takács Renáta",    email: "takacs.renata@preview.hu",     city: "Debrecen" },
      { name: "Juhász Balázs",    email: "juhasz.balazs@preview.hu",     city: "Pécs" },
      { name: "Vincze Nóra",      email: "vincze.nora@preview.hu",       city: "Budapest" },
      { name: "Szőke Tamás",      email: "szoke.tamas@preview.hu",       city: "Győr" },
      { name: "Farkas Réka",      email: "farkas.reka@preview.hu",       city: "Miskolc" },
      { name: "Somogyi András",   email: "somogyi.andras@preview.hu",    city: "Budapest" },
      { name: "Lukács Veronika",  email: "lukacs.veronika@preview.hu",   city: "Debrecen" },
      { name: "Erdős Máté",       email: "erdos.mate@preview.hu",        city: "Pécs" },
      { name: "Hegedűs Ilona",    email: "hegedus.ilona@preview.hu",     city: "Budapest" },
    ];
    const users = await Promise.all(
      userNames.map(d => prisma.user.create({
        data: { ...d, password: userHash, role: Role.USER, emailVerified: new Date(), emailNotifications: true, country: "HU" },
      }))
    );
    const [u1,u2,u3,u4,u5,u6,u7,u8,u9,u10,u11,u12,u13,u14,u15] = users;

    // 5. Shelters (5 Hungarian cities)
    const shelterDefs = [
      { name: "Mancs Menhely Budapest", slug: "mancs-menhely-budapest", city: "Budapest", zipCode: "1134", address: "Állatvédő utca 12.", phone: "+3613334455", email: "info@mancs.hu", capacity: 60, lat: 47.5093, lng: 19.0678, description: "A Mancs Menhely Budapest 2008 óta működő nonprofit szervezet. Fővárosi és agglomerációs kóbor, elhagyott állatokat fogadunk be, és keresünk nekik szerető otthont." },
      { name: "Paca Állatmenhely Debrecen", slug: "paca-allatmenhely-debrecen", city: "Debrecen", zipCode: "4025", address: "Menhely köz 3.", phone: "+3652445566", email: "info@paca.hu", capacity: 50, lat: 47.5316, lng: 21.6273, description: "Debrecen legnagyobb állatmenhelye, ahol több mint 200 állat vár szerető gazdára. 2005 óta működünk nonprofit alapon a Tiszántúl legnépesebb városában." },
      { name: "Baranya Állatmenhely Pécs", slug: "baranya-allatmenhely-pecs", city: "Pécs", zipCode: "7622", address: "Pécsi állattartó út 7.", phone: "+3672334422", email: "menhely@baranya.hu", capacity: 40, lat: 46.0727, lng: 18.2323, description: "A Baranya Állatmenhely Pécs és vonzáskörzetének gazdátlan állatait gondozza. Célunk a felelős állattartás elősegítése és az örökbefogadás kultúrájának terjesztése." },
      { name: "Rábca Menhely Győr", slug: "rabca-menhely-gyor", city: "Győr", zipCode: "9021", address: "Rábca part 22.", phone: "+3696223344", email: "rabca@menhely.hu", capacity: 35, lat: 47.6875, lng: 17.6504, description: "A Rábca Menhely Győr-Moson-Sopron megye egyik legnagyobb állatvédelmi szervezete. Több mint 15 éve segítünk gazdát találni a rászoruló állatoknak." },
      { name: "Bükki Állatmenedék Miskolc", slug: "bukki-allatmenedek-miskolc", city: "Miskolc", zipCode: "3519", address: "Bükki út 15.", phone: "+3646334455", email: "bukki@menedek.hu", capacity: 30, lat: 48.1035, lng: 20.7784, description: "A Bükki Állatmenedék Miskolc és a Bükk hegység térségének rászoruló állatain segít. Önkéntesekkel és adományokból tartjuk fenn a menhelyet." },
    ];
    const shelters = await Promise.all(
      shelterDefs.map(d => prisma.shelter.create({
        data: { ...d, country: "HU", isVerified: true, isActive: true },
      }))
    );
    const [bp, deb, pecs, gyor, misk] = shelters;

    // 6. Link shelter admins
    await Promise.all(
      shelters.map((s, i) => prisma.shelterAdmin.create({
        data: { userId: shelterAdmins[i].id, shelterId: s.id },
      }))
    );

    // 7. Animals (8 per shelter = 40 total)
    const IMG: Record<AnimalType, string> = { DOG: "dog", CAT: "cat", RABBIT: "rabbit", BIRD: "parrot", OTHER: "hamster" };

    type AnimalDef = { name: string; slug: string; type: AnimalType; breed: string; age: number; size: AnimalSize; gender: string; color: string; weight: number; description: string; isVaccinated: boolean; isNeutered: boolean; isMicrochipped: boolean; isGoodWithKids: boolean; isGoodWithDogs: boolean; isGoodWithCats: boolean; status: AnimalStatus; arrivedAt: Date; adoptedAt?: Date; shelterId: string; imgSeed: number; };

    const animalDefs: AnimalDef[] = [
      // Budapest
      { name: "Bodri",    slug: "bodri-bp",    type: AnimalType.DOG,    breed: "Labrador Retriever", age: 36, size: AnimalSize.LARGE,       gender: "MALE",   color: "sárga",              weight: 28.5, description: "Barátságos, energikus labrador. Gyerekekkel kiválóan kijön, alapengedelmességre kiképzett. Ideális első kutya aktív családoknak.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(120), shelterId: bp.id,   imgSeed: 101 },
      { name: "Rex",      slug: "rex-bp",      type: AnimalType.DOG,    breed: "Keverék",           age: 72, size: AnimalSize.MEDIUM,      gender: "MALE",   color: "fekete-barna",       weight: 18.0, description: "Idős, de lelkes keverék kutya. Csendes lakókörnyezetbe, tapasztalt gazdához ajánljuk. Macskával elfér.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(200), shelterId: bp.id,   imgSeed: 102 },
      { name: "Morzsa",   slug: "morzsa-bp",   type: AnimalType.DOG,    breed: "Puli",              age: 24, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "fekete",             weight: 13.0, description: "Vidám, játékos puli kölyök. Kérelem beérkezett, jelenleg elbírálás alatt.", isVaccinated: true,  isNeutered: false, isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: true,  status: AnimalStatus.PENDING,   arrivedAt: daysAgo(90),  shelterId: bp.id,   imgSeed: 103 },
      { name: "Cica",     slug: "cica-bp",     type: AnimalType.CAT,    breed: "Brit rövidszőrű",   age: 24, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "szürke",             weight: 4.2,  description: "Kiegyensúlyozott, affektív macska. Lakásban szívesen él egyedül vagy más macskákkal. Könnyen gondozható.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(80),  shelterId: bp.id,   imgSeed: 201 },
      { name: "Tündér",   slug: "tunder-bp",   type: AnimalType.CAT,    breed: "Keverék",           age: 12, size: AnimalSize.SMALL,       gender: "FEMALE", color: "fehér-narancssárga", weight: 2.8,  description: "Fiatal, játékos cicakölyök. Imádja a labdát és a csörgőjátékokat. Gyerekekhez kiváló társ.", isVaccinated: true,  isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(40),  shelterId: bp.id,   imgSeed: 202 },
      { name: "Max",      slug: "max-bp",      type: AnimalType.DOG,    breed: "Szibériai Husky",   age: 30, size: AnimalSize.LARGE,       gender: "MALE",   color: "szürke-fehér",       weight: 25.0, description: "Lenyűgöző szibériai husky. Aktív, mozgásszerető gazdát keres – futás, kerékpározás mellé ideális társ.", isVaccinated: true,  isNeutered: false, isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(60),  shelterId: bp.id,   imgSeed: 104 },
      { name: "Füles",    slug: "fules-bp",    type: AnimalType.RABBIT, breed: "Holland törpe",     age: 14, size: AnimalSize.SMALL,       gender: "MALE",   color: "fehér-szürke",       weight: 1.2,  description: "Aranyos Holland törpe nyuszi. Jól megszokja az embereket, szeret simogatást kapni. Könnyű gondozni.", isVaccinated: false, isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(55),  shelterId: bp.id,   imgSeed: 301 },
      { name: "Luna",     slug: "luna-bp",     type: AnimalType.CAT,    breed: "Keverék",           age: 6,  size: AnimalSize.SMALL,       gender: "FEMALE", color: "fekete",             weight: 1.8,  description: "Kölyökcica, állatorvosi megfigyelés alatt. Felső légúti fertőzés, hamarosan felgyógyul és örökbe adható lesz!", isVaccinated: false, isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.MEDICAL_HOLD, arrivedAt: daysAgo(14), shelterId: bp.id,   imgSeed: 203 },
      // Debrecen
      { name: "Bruno",    slug: "bruno-deb",   type: AnimalType.DOG,    breed: "Német juhász",      age: 48, size: AnimalSize.LARGE,       gender: "MALE",   color: "fekete-barna",       weight: 32.0, description: "Intelligens, tanulékony német juhász. Képzett és megbízható, biztos kézbe ajánlott. Más kutyával nem fér el.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(90),  shelterId: deb.id,  imgSeed: 105 },
      { name: "Cinke",    slug: "cinke-deb",   type: AnimalType.CAT,    breed: "Perzsa",            age: 36, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "fehér",              weight: 4.8,  description: "Gyönyörű fehér perzsa macska. Szereti a kényelmet és a csendet. Kizárólag lakásba ajánljuk.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(45),  shelterId: deb.id,  imgSeed: 204 },
      { name: "Breki",    slug: "breki-deb",   type: AnimalType.DOG,    breed: "Beagle",            age: 24, size: AnimalSize.MEDIUM,      gender: "MALE",   color: "tricolor",           weight: 14.0, description: "Energikus beagle, megtalálta álomgazdáját! Aktív, futásszerető párhoz került.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.ADOPTED,   arrivedAt: daysAgo(200), adoptedAt: daysAgo(15), shelterId: deb.id,  imgSeed: 106 },
      { name: "Hópehely", slug: "hopehely-deb",type: AnimalType.CAT,    breed: "Angóra",            age: 18, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "fehér",              weight: 3.5,  description: "Lágy angóra macska. Hosszú szőre rendszeres ápolást igényel, cserébe rengeteg ragaszkodást ad.", isVaccinated: true,  isNeutered: false, isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(70),  shelterId: deb.id,  imgSeed: 205 },
      { name: "Keno",     slug: "keno-deb",    type: AnimalType.DOG,    breed: "Rottweiler",        age: 36, size: AnimalSize.EXTRA_LARGE, gender: "MALE",   color: "fekete-barna",       weight: 42.0, description: "Jól szocializált rottweiler, tapasztalt, határozott gazdát igényel. Kertes házba ajánljuk.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(150), shelterId: deb.id,  imgSeed: 107 },
      { name: "Mimi",     slug: "mimi-deb",    type: AnimalType.CAT,    breed: "Keverék",           age: 8,  size: AnimalSize.SMALL,       gender: "FEMALE", color: "tarka",              weight: 2.1,  description: "Apró, tarka cicakölyök. Kérelem beérkezett – örökbefogadás folyamatban.", isVaccinated: true,  isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.PENDING,   arrivedAt: daysAgo(30),  shelterId: deb.id,  imgSeed: 206 },
      { name: "Bambi",    slug: "bambi-deb",   type: AnimalType.RABBIT, breed: "Angóra nyúl",       age: 10, size: AnimalSize.SMALL,       gender: "FEMALE", color: "fehér",              weight: 1.8,  description: "Bolyhos, fehér angóra nyúl. Szelíd természetű, szereti a simogatást. Gyerekekkel is jól kijön.", isVaccinated: false, isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(25),  shelterId: deb.id,  imgSeed: 302 },
      { name: "Tücsök",   slug: "tucsok-deb",  type: AnimalType.DOG,    breed: "Keverék",           age: 18, size: AnimalSize.SMALL,       gender: "MALE",   color: "barna",              weight: 7.5,  description: "Apró, eleven keverék kutya. Átmeneti gondozásnál van, örökbefogadóra vár. Macskával és kutyával is elfér.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: true,  status: AnimalStatus.FOSTER,    arrivedAt: daysAgo(60),  shelterId: deb.id,  imgSeed: 108 },
      // Pécs
      { name: "Árnyék",   slug: "arnyok-pecs", type: AnimalType.DOG,    breed: "Dobermann",         age: 36, size: AnimalSize.LARGE,       gender: "MALE",   color: "fekete-rozsdabarna", weight: 34.0, description: "Elegáns dobermann, szocializált és engedelmességre kiképzett. Tapasztalt gazdát keres kertes házba.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(110), shelterId: pecs.id, imgSeed: 109 },
      { name: "Pötty",    slug: "potty-pecs",  type: AnimalType.CAT,    breed: "Keverék",           age: 30, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "foltos szürke",      weight: 3.8,  description: "Csintalan foltos macska. Szereti a magasságot és az aktív játékot. Nagyon barátságos.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(55),  shelterId: pecs.id, imgSeed: 207 },
      { name: "Roki",     slug: "roki-pecs",   type: AnimalType.DOG,    breed: "Keverék",           age: 48, size: AnimalSize.MEDIUM,      gender: "MALE",   color: "barna-fehér",        weight: 16.0, description: "Szelíd, megbízható keverék kutya. Kertes háznál, vidéken is kiváló társ. Gyerekekkel jó.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(130), shelterId: pecs.id, imgSeed: 110 },
      { name: "Szikra",   slug: "szikra-pecs", type: AnimalType.CAT,    breed: "Maine Coon",        age: 48, size: AnimalSize.LARGE,       gender: "MALE",   color: "tarka",              weight: 7.2,  description: "Impozáns Maine Coon macska. Szeret társaságban lenni, kutyaszerű természete van. Könnyen sétáltatható pórázzon.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(75),  shelterId: pecs.id, imgSeed: 208 },
      { name: "Nemo",     slug: "nemo-pecs",   type: AnimalType.BIRD,   breed: "Nimfa papagáj",     age: 24, size: AnimalSize.SMALL,       gender: "MALE",   color: "zöld-sárga",         weight: 0.1,  description: "Vidám, énekes nimfa papagáj. Tud néhány szót és imádja a zenét. Páros tartásban a legboldogabb.", isVaccinated: false, isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(40),  shelterId: pecs.id, imgSeed: 401 },
      { name: "Flash",    slug: "flash-pecs",  type: AnimalType.DOG,    breed: "Vizsla keverék",    age: 18, size: AnimalSize.LARGE,       gender: "MALE",   color: "arany-barna",        weight: 22.0, description: "Energikus, vásott vizsla keverék. Aktív, sportos gazdát keres – futás és kerékpározás imád.", isVaccinated: true,  isNeutered: false, isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.PENDING,   arrivedAt: daysAgo(45),  shelterId: pecs.id, imgSeed: 111 },
      { name: "Mogyoró",  slug: "mogyoro-pecs",type: AnimalType.RABBIT, breed: "Keverék nyúl",      age: 20, size: AnimalSize.MEDIUM,      gender: "MALE",   color: "barna",              weight: 2.5,  description: "Vidám, aktív nyúl. Szeret ugrálni és felfedezni. Nevéhez képest szelíd és barátságos.", isVaccinated: false, isNeutered: true,  isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(35),  shelterId: pecs.id, imgSeed: 303 },
      { name: "Kira",     slug: "kira-pecs",   type: AnimalType.DOG,    breed: "Husky keverék",     age: 24, size: AnimalSize.LARGE,       gender: "FEMALE", color: "fekete-fehér",       weight: 22.0, description: "Kira megtalálta álomgazdáját! Aktív sportos párhoz került Pécsre.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.ADOPTED,   arrivedAt: daysAgo(180), adoptedAt: daysAgo(20), shelterId: pecs.id, imgSeed: 112 },
      // Győr
      { name: "Ares",     slug: "ares-gyor",   type: AnimalType.DOG,    breed: "Belga Malinois",    age: 36, size: AnimalSize.LARGE,       gender: "MALE",   color: "barna-fekete",       weight: 29.0, description: "Magas energiájú, intelligens malinois. Csak tapasztalt, aktív gazdának ajánljuk. Képzett.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(95),  shelterId: gyor.id, imgSeed: 113 },
      { name: "Baba",     slug: "baba-gyor",   type: AnimalType.CAT,    breed: "Keverék",           age: 24, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "narancssárga-fehér", weight: 3.6,  description: "Kedves, barátságos macska, szereti az emberek társaságát. Könnyen gondozni, kezdőknek is ideális.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(60),  shelterId: gyor.id, imgSeed: 209 },
      { name: "Dió",      slug: "dio-gyor",    type: AnimalType.RABBIT, breed: "Holland törpe",     age: 8,  size: AnimalSize.SMALL,       gender: "FEMALE", color: "barna-fehér",        weight: 1.1,  description: "Apró Holland törpe nyuszi, nagyon szelíd. Első nyulat tartóknak is ajánlott.", isVaccinated: false, isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(20),  shelterId: gyor.id, imgSeed: 304 },
      { name: "Sárkány",  slug: "sarkany-gyor",type: AnimalType.DOG,    breed: "Keverék",           age: 60, size: AnimalSize.LARGE,       gender: "MALE",   color: "szürke-barna",       weight: 27.0, description: "Középkorú, megbízható keverék kutya. Kertes házhoz ideális – nappal kint, este benn lehet.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(180), shelterId: gyor.id, imgSeed: 114 },
      { name: "Lili",     slug: "lili-gyor",   type: AnimalType.CAT,    breed: "Brit rövidszőrű",   age: 18, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "kék szürke",         weight: 4.0,  description: "Szép kék brit macska. Kiegyensúlyozott, könnyen kezelhető, remekül alkalmazkodik új otthonhoz.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(40),  shelterId: gyor.id, imgSeed: 210 },
      { name: "Gömböc",   slug: "gomboc-gyor", type: AnimalType.CAT,    breed: "Perzsa keverék",    age: 48, size: AnimalSize.LARGE,       gender: "MALE",   color: "fehér-bézs",         weight: 6.8,  description: "Nagy, dundi perzsa keverék. Jelenleg állatorvosi kezelés alatt, hamarosan örökbefogadható lesz.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.MEDICAL_HOLD, arrivedAt: daysAgo(30), shelterId: gyor.id, imgSeed: 211 },
      { name: "Hector",   slug: "hector-gyor", type: AnimalType.DOG,    breed: "Boxer",             age: 30, size: AnimalSize.LARGE,       gender: "MALE",   color: "barna-fehér",        weight: 30.0, description: "Játékos, szerethető boxer. Imádja a gyerekeket és más kutyákat. Kérelem beérkezett.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.PENDING,   arrivedAt: daysAgo(65),  shelterId: gyor.id, imgSeed: 115 },
      { name: "Zita",     slug: "zita-gyor",   type: AnimalType.CAT,    breed: "Keverék",           age: 12, size: AnimalSize.SMALL,       gender: "FEMALE", color: "fekete-fehér",       weight: 2.5,  description: "Zita megtalálta új otthonát – fiatal párhoz került Győrbe.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.ADOPTED,   arrivedAt: daysAgo(120), adoptedAt: daysAgo(10), shelterId: gyor.id, imgSeed: 212 },
      // Miskolc
      { name: "Thor",     slug: "thor-misk",   type: AnimalType.DOG,    breed: "Labrador keverék",  age: 24, size: AnimalSize.LARGE,       gender: "MALE",   color: "fekete",             weight: 30.0, description: "Nagy, barátságos fekete labrador keverék. Szeret úszni és aktív sportos életet élni.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(80),  shelterId: misk.id, imgSeed: 116 },
      { name: "Maci",     slug: "maci-misk",   type: AnimalType.CAT,    breed: "Keverék",           age: 36, size: AnimalSize.MEDIUM,      gender: "MALE",   color: "barna tarka",        weight: 5.1,  description: "Nagy, dundi keverék macska. Nyugodt természetű, imád lustálkodni. Ideális kanapé-társ.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(100), shelterId: misk.id, imgSeed: 213 },
      { name: "Pelyhes",  slug: "pelyhes-misk",type: AnimalType.RABBIT, breed: "Angóra keverék",    age: 16, size: AnimalSize.SMALL,       gender: "FEMALE", color: "krém",               weight: 1.5,  description: "Puha, krémszínű nyuszi. Szeret a kertben futkalászni, ha van rá lehetőség.", isVaccinated: false, isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(45),  shelterId: misk.id, imgSeed: 305 },
      { name: "Cézár",    slug: "cezar-misk",  type: AnimalType.DOG,    breed: "Keverék",           age: 84, size: AnimalSize.LARGE,       gender: "MALE",   color: "szürke",             weight: 26.0, description: "Idős, bölcs keverék. Csendes, nyugodt otthont keres, ahol méltósággal élheti utolsó éveit.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(250), shelterId: misk.id, imgSeed: 117 },
      { name: "Bella",    slug: "bella-misk",  type: AnimalType.DOG,    breed: "Golden Retriever",  age: 18, size: AnimalSize.LARGE,       gender: "FEMALE", color: "arany",              weight: 24.0, description: "Aranyos golden retriever kölyök. Barátságos, imádja az embereket és a többi állatot is.", isVaccinated: true,  isNeutered: false, isMicrochipped: true,  isGoodWithKids: true,  isGoodWithDogs: true,  isGoodWithCats: true,  status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(35),  shelterId: misk.id, imgSeed: 118 },
      { name: "Miska",    slug: "miska-misk",  type: AnimalType.CAT,    breed: "Keverék",           age: 10, size: AnimalSize.SMALL,       gender: "MALE",   color: "fekete",             weight: 1.9,  description: "Kis fekete cicakölyök, kérelem beérkezett. Heves, játékos természetű, sok vidámságot hoz a házba.", isVaccinated: true,  isNeutered: false, isMicrochipped: false, isGoodWithKids: true,  isGoodWithDogs: false, isGoodWithCats: true,  status: AnimalStatus.PENDING,   arrivedAt: daysAgo(22),  shelterId: misk.id, imgSeed: 214 },
      { name: "Geri",     slug: "geri-misk",   type: AnimalType.DOG,    breed: "Keverék",           age: 30, size: AnimalSize.MEDIUM,      gender: "MALE",   color: "bézs",               weight: 12.0, description: "Átmeneti befogadónál van. Félénk, de melegszívű keverék. Türelmes, tapasztalt gazdát keres.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.FOSTER,    arrivedAt: daysAgo(75),  shelterId: misk.id, imgSeed: 119 },
      { name: "Fifi",     slug: "fifi-misk",   type: AnimalType.CAT,    breed: "Sziámi keverék",    age: 60, size: AnimalSize.MEDIUM,      gender: "FEMALE", color: "krém-barna",         weight: 4.4,  description: "Elegáns sziámi keverék, szalkali hangú. Csendes, tapasztalt gazdánál boldogul legjobban.", isVaccinated: true,  isNeutered: true,  isMicrochipped: true,  isGoodWithKids: false, isGoodWithDogs: false, isGoodWithCats: false, status: AnimalStatus.AVAILABLE, arrivedAt: daysAgo(90),  shelterId: misk.id, imgSeed: 215 },
    ];

    const animalIds: Record<string, string> = {};
    for (const { imgSeed, ...def } of animalDefs) {
      const animal = await prisma.animal.create({ data: def });
      animalIds[def.slug] = animal.id;
      await prisma.animalImage.create({
        data: { animalId: animal.id, url: `https://loremflickr.com/640/480/${IMG[def.type]}?lock=${imgSeed}`, alt: `${def.name} fotó`, isPrimary: true, order: 0 },
      });
    }

    // 8. Donation tiers (per shelter)
    const tierNames = [
      { name: "Alapcsomag", amount: 1000,  description: "Havi 1 000 Ft – egy kisállat ételéhez jársz hozzá." },
      { name: "Barát",      amount: 2500,  description: "Havi 2 500 Ft – egy gondozottunk heti ellátásának fele." },
      { name: "Védnök",     amount: 5000,  description: "Havi 5 000 Ft – neveddel dicsekedhetünk az oldalon!" },
      { name: "Nagylelkű",  amount: 10000, description: "Havi 10 000 Ft – igazi mentőangyal vagy!" },
    ];
    const tiers: Record<string, Record<string, string>> = {};
    for (const s of shelters) {
      tiers[s.id] = {};
      for (const t of tierNames) {
        const tier = await prisma.donationTier.create({ data: { shelterId: s.id, ...t, isActive: true } });
        tiers[s.id][t.name] = tier.id;
      }
    }

    // 9. Campaigns (4: 3 active, 1 completed)
    const camps = await Promise.all([
      prisma.campaign.create({ data: { userId: shelterAdmins[0].id, shelterId: bp.id,   title: "Téli takarmány összefogás",   slug: "teli-takarmany-bp",    description: "Télen állataink ételszükséglete megnő. Segíts feltölteni a készletet! Célunk 500 000 Ft összegyűjtése takarmányra és gyógyszerekre.", targetAmount: 500000, raisedAmount: 187500, status: CampaignStatus.ACTIVE,     endsAt: daysFromNow(45) } }),
      prisma.campaign.create({ data: { userId: shelterAdmins[1].id, shelterId: deb.id,  title: "Új kennel építése",           slug: "uj-kennel-deb",        description: "Debreceni menhelyünkön 12 új férőhelyet szeretnénk kialakítani. Segítségeddel több állat kaphat biztonságos otthont!", targetAmount: 800000, raisedAmount: 320000, status: CampaignStatus.ACTIVE,     endsAt: daysFromNow(60) } }),
      prisma.campaign.create({ data: { userId: shelterAdmins[2].id, shelterId: pecs.id, title: "Állatorvosi felszerelések",   slug: "veter-felszereles-pecs",description: "Pécsi menhelyünk ultrahangkészüléket, röntgent és sebészeti eszközöket igényel az állatok jobb ellátásához.", targetAmount: 1200000, raisedAmount: 543000, status: CampaignStatus.ACTIVE,    endsAt: daysFromNow(30) } }),
      prisma.campaign.create({ data: { userId: shelterAdmins[3].id, shelterId: gyor.id, title: "Tél előtti felkészülés Győr",slug: "tel-felkeszules-gyor",  description: "Győri menhelyünk tél előtt töltötte fel készleteit. A gyűjtés sikerrel zárult – köszönjük minden támogatást!", targetAmount: 300000, raisedAmount: 312000, status: CampaignStatus.COMPLETED, endsAt: daysAgo(10) } }),
    ]);

    // 10. Donations
    const donDefs = [
      { userId: u1.id,  campaignId: camps[0].id, amount: 5000,  stripeSessionId: "cs_prev_0001" },
      { userId: u2.id,  campaignId: camps[0].id, amount: 10000, stripeSessionId: "cs_prev_0002" },
      { userId: u3.id,  campaignId: camps[1].id, amount: 25000, stripeSessionId: "cs_prev_0003" },
      { userId: u4.id,  campaignId: camps[1].id, amount: 5000,  stripeSessionId: "cs_prev_0004" },
      { userId: u5.id,  campaignId: camps[2].id, amount: 50000, stripeSessionId: "cs_prev_0005" },
      { userId: u6.id,  campaignId: camps[2].id, amount: 15000, stripeSessionId: "cs_prev_0006" },
      { userId: u7.id,  campaignId: camps[3].id, amount: 8000,  stripeSessionId: "cs_prev_0007" },
      { userId: u8.id,  campaignId: camps[0].id, amount: 2500,  stripeSessionId: "cs_prev_0008" },
      { userId: u9.id,  campaignId: camps[1].id, amount: 20000, stripeSessionId: "cs_prev_0009" },
      { userId: u10.id, campaignId: camps[2].id, amount: 30000, stripeSessionId: "cs_prev_0010" },
      { userId: u11.id, campaignId: camps[0].id, amount: 1000,  stripeSessionId: "cs_prev_0011" },
      { userId: u12.id, campaignId: camps[3].id, amount: 5000,  stripeSessionId: "cs_prev_0012" },
    ];
    await prisma.donation.createMany({
      data: donDefs.map(d => ({ ...d, paidAt: daysAgo(Math.floor(Math.random() * 40) + 1) })),
    });

    // 11. Subscriptions
    await prisma.subscription.createMany({
      data: [
        { userId: u1.id,  tierId: tiers[bp.id]["Barát"],      status: "ACTIVE" },
        { userId: u2.id,  tierId: tiers[bp.id]["Védnök"],     status: "ACTIVE" },
        { userId: u3.id,  tierId: tiers[deb.id]["Alapcsomag"],status: "ACTIVE" },
        { userId: u4.id,  tierId: tiers[deb.id]["Nagylelkű"], status: "ACTIVE" },
        { userId: u5.id,  tierId: tiers[pecs.id]["Barát"],    status: "ACTIVE" },
        { userId: u11.id, tierId: tiers[gyor.id]["Védnök"],   status: "ACTIVE" },
        { userId: u12.id, tierId: tiers[misk.id]["Alapcsomag"],status: "ACTIVE" },
        { userId: u13.id, tierId: tiers[bp.id]["Nagylelkű"],  status: "ACTIVE" },
        { userId: u6.id,  tierId: tiers[bp.id]["Alapcsomag"], status: "CANCELLED" },
        { userId: u14.id, tierId: tiers[pecs.id]["Védnök"],   status: "CANCELLED" },
      ],
    });

    // 12. Adoption applications
    const appDefs = [
      { userId: u1.id,  animalId: animalIds["morzsa-bp"],   status: ApplicationStatus.PENDING,   message: "Szeretnénk örökbefogadni Mozrsát. Kertes házban élünk, van udvar és futtatópálya.", homeType: "HOUSE",     hasGarden: true,  hasChildren: false, hasPets: false, experience: "10+ év kutyatartási tapasztalat, volt pulink korábban.",          reviewNotes: null,                              createdAt: daysAgo(12), reviewedAt: null },
      { userId: u2.id,  animalId: animalIds["cica-bp"],     status: ApplicationStatus.REVIEWING, message: "Cicát keresek lakótársnak. Nappal egyedül tartózkodnék, este sok időm van rá.",    homeType: "APARTMENT", hasGarden: false, hasChildren: false, hasPets: false, experience: "Először tartanék macskát, de sokat olvastam a gondozásukról.",    reviewNotes: null,                              createdAt: daysAgo(20), reviewedAt: daysAgo(10) },
      { userId: u3.id,  animalId: animalIds["max-bp"],      status: ApplicationStatus.APPROVED,  message: "Maxot szeretnénk örökbefogadni. Futás és kerékpározás a hobbink, napi 10 km+.",    homeType: "HOUSE",     hasGarden: true,  hasChildren: false, hasPets: false, experience: "Volt már huskyink, ismerjük a fajta igényeit.",                   reviewNotes: "Ideális aktív gazda. Javaslom.",  createdAt: daysAgo(40), reviewedAt: daysAgo(30) },
      { userId: u4.id,  animalId: animalIds["mimi-deb"],    status: ApplicationStatus.PENDING,   message: "Kis cicát keresünk a gyerekeinknek. Mimi nagyon aranyos, elolvadtunk érte.",        homeType: "HOUSE",     hasGarden: true,  hasChildren: true,  hasPets: false, experience: "Volt már cicánk, gyerekeink felelősen bánnak az állatokkal.",    reviewNotes: null,                              createdAt: daysAgo(8),  reviewedAt: null },
      { userId: u5.id,  animalId: animalIds["flash-pecs"],  status: ApplicationStatus.REVIEWING, message: "Flash-t szeretném örökbefogadni. Naponta futok, kiváló társ lenne.",               homeType: "APARTMENT", hasGarden: false, hasChildren: false, hasPets: false, experience: "Volt labradorem, ismerem az energiás fajták igényeit.",           reviewNotes: null,                              createdAt: daysAgo(15), reviewedAt: daysAgo(7) },
      { userId: u6.id,  animalId: animalIds["hector-gyor"], status: ApplicationStatus.PENDING,   message: "Hectort szívesen örökbefogadnánk. Nagy kertünk van, gyerekeink boxer-rajongók.",    homeType: "HOUSE",     hasGarden: true,  hasChildren: true,  hasPets: true,  experience: "Jelenleg is van egy idős labadorunk.",                           reviewNotes: null,                              createdAt: daysAgo(5),  reviewedAt: null },
      { userId: u7.id,  animalId: animalIds["miska-misk"],  status: ApplicationStatus.PENDING,   message: "Miskát szeretném örökbefogadni. Egyedül élek és macska-társat keresek.",             homeType: "APARTMENT", hasGarden: false, hasChildren: false, hasPets: false, experience: "Volt már macskám, korábban is örökbe fogadtam.",                  reviewNotes: null,                              createdAt: daysAgo(3),  reviewedAt: null },
      { userId: u8.id,  animalId: animalIds["bella-misk"],  status: ApplicationStatus.INVITED,   message: "Bellát szeretnénk – két gyerekünk van, és már régóta golden retrievert keresünk.",  homeType: "HOUSE",     hasGarden: true,  hasChildren: true,  hasPets: false, experience: "Gyerekkorunkban volt kutyánk, felelősen bánunk az állatokkal.",   reviewNotes: "Személyes látogatás ajánlott.",   createdAt: daysAgo(25), reviewedAt: daysAgo(20) },
      { userId: u9.id,  animalId: animalIds["bodri-bp"],    status: ApplicationStatus.REJECTED,  message: "Bodrira jelentkeztem, remek kutya.",                                                 homeType: "APARTMENT", hasGarden: false, hasChildren: false, hasPets: false, experience: "Nincs tapasztalatom nagy kutyával.",                              reviewNotes: "Labrador számára nem megfelelő lakókörnyezet.", createdAt: daysAgo(50), reviewedAt: daysAgo(45) },
      { userId: u10.id, animalId: animalIds["thor-misk"],   status: ApplicationStatus.APPROVED,  message: "Thor-t szeretném örökbefogadni. Nagy kertes házban élünk, aktív a família.",        homeType: "HOUSE",     hasGarden: true,  hasChildren: true,  hasPets: false, experience: "Volt már labrador keverékünk.",                                   reviewNotes: "Kiváló gazda, ajánlott.",          createdAt: daysAgo(35), reviewedAt: daysAgo(28) },
    ];
    for (const { createdAt, reviewedAt, ...rest } of appDefs) {
      await prisma.adoptionApplication.create({
        data: { ...rest, createdAt, reviewedAt: reviewedAt ?? null },
      });
    }

    // 13. Reviews
    await prisma.review.createMany({
      data: [
        { authorId: u1.id,  shelterId: bp.id,   rating: 5, comment: "Fantasztikus csapat! Tökéletes otthont találtak nekünk. Folyamatos támogatást nyújtottak az örökbefogadás után is." },
        { authorId: u2.id,  shelterId: bp.id,   rating: 4, comment: "Nagyon segítőkész személyzet. Az önkéntes program jól szervezett, csak a nyitvatartás lehetne rugalmasabb." },
        { authorId: u3.id,  shelterId: bp.id,   rating: 5, comment: "Profi, gondoskodó csapat. A kérelem folyamata átlátható volt és gyors visszajelzéseket kaptam." },
        { authorId: u4.id,  shelterId: deb.id,  rating: 5, comment: "Debrecenben a legjobb menhely! Mimivel nagyon elégedett vagyok, a csapat végig segített." },
        { authorId: u5.id,  shelterId: pecs.id, rating: 4, comment: "Pécsi menhely kiváló, csak a nyitvatartás lehetne kicsit hosszabb." },
        { authorId: u6.id,  shelterId: gyor.id, rating: 5, comment: "Győrben is van igényes, szívből gondoskodó menhely! Hectorral nagyon elégedett vagyok." },
        { authorId: u7.id,  shelterId: misk.id, rating: 4, comment: "Miskolcon is kiváló a csapat. Miskával hamarosan hazamegyünk, alig várjuk!" },
        { authorId: u8.id,  shelterId: misk.id, rating: 5, comment: "Bella csodálatos, a gyerekeink imádják. Köszönjük a Bükki Állatmenedéknek!" },
        { authorId: u9.id,  shelterId: bp.id,   rating: 3, comment: "Sajnos elutasítottak, de legalább megmagyarázták miért. Értékelem az őszinteséget." },
        { authorId: u10.id, shelterId: misk.id, rating: 5, comment: "Thorral boldog a família! Köszönjük a segítséget." },
        { authorId: u11.id, shelterId: gyor.id, rating: 4, comment: "Jó szervezet, lelkes önkéntesek. A készlet rendszer különösen tetszett." },
        { authorId: u12.id, shelterId: deb.id,  rating: 5, comment: "Breki az életünk lett! Köszönjük a Paca Állatmenhelynek a tökéletes párosítást." },
      ],
    });

    // 14. Events (5, one per shelter)
    await prisma.event.createMany({
      data: [
        { shelterId: bp.id,   title: "Örökbefogadási nap – Budapest",    slug: "orokbefogadasi-nap-bp",    description: "Hozd el a családodat és ismerd meg menhelyi állatainkat! Személyes találkozó, állatsimogatás, és aki ott van, elsőként dönthet az örökbefogadásról.", type: EventType.ADOPTION_DAY,  location: "Mancs Menhely Budapest, Állatvédő utca 12.",     startsAt: daysFromNow(14), endsAt: daysFromNow(14), capacity: 50,  status: EventStatus.PUBLISHED },
        { shelterId: deb.id,  title: "Önkéntes nap – Debrecen",          slug: "onkentes-nap-deb",         description: "Csatlakozz önkéntes csapatunkhoz! Sétáltatás, játék, takarítás – minden segítség számít. Ebédet és italt biztosítunk.", type: EventType.VOLUNTEER_DAY, location: "Paca Állatmenhely, Menhely köz 3.",               startsAt: daysFromNow(7),  endsAt: daysFromNow(7),  capacity: 20,  status: EventStatus.PUBLISHED },
        { shelterId: pecs.id, title: "Állatvédelmi vetítés – Pécs",      slug: "allatvedelmi-vetites-pecs",description: "Ingyenes dokumentumfilm vetítés az állatjogokról és a felelős tartásról. Mindenkit szeretettel várunk!", type: EventType.EDUCATION,     location: "Baranya Állatmenhely, Pécsi állattartó út 7.",   startsAt: daysFromNow(21), endsAt: daysFromNow(21), capacity: 80,  status: EventStatus.PUBLISHED },
        { shelterId: gyor.id, title: "Karitász futás – Győr",             slug: "karitasz-futas-gyor",      description: "5 km-es jótékonysági futás a rászoruló menhelyi állatok javára. Minden részvételi díj a győri menhelynek jut.", type: EventType.FUNDRAISER,    location: "Rábca part, Győr",                                startsAt: daysFromNow(30), endsAt: daysFromNow(30), capacity: 200, status: EventStatus.PUBLISHED },
        { shelterId: misk.id, title: "Téli adománygyűjtés – Miskolc",    slug: "teli-adomanygyjtes-misk",  description: "Hozz takarmányt, gyógyszert vagy tisztítószert! Mindenféle adományt szívesen fogadunk, hogy télen is el legyenek látva gondozottjaink.", type: EventType.OPEN_DAY,     location: "Bükki Állatmenedék, Bükki út 15.",               startsAt: daysFromNow(5),  endsAt: daysFromNow(5),  capacity: 100, status: EventStatus.PUBLISHED },
      ],
    });

    // 15. Volunteers
    await prisma.volunteer.createMany({
      data: [
        { userId: u11.id, shelterId: bp.id,   status: VolunteerStatus.ACTIVE,   motivation: "Gyerekkorom óta szeretek állatokkal foglalkozni. Hétvégenként szívesen segítek.",  skills: "Sétáltatás, szocializáció, fotózás",    availability: "Szombat, vasárnap" },
        { userId: u12.id, shelterId: bp.id,   status: VolunteerStatus.PENDING,  motivation: "Nemrég költöztem Budapestre, és szeretnék hasznos lenni a közösség számára.",     skills: "Adminisztráció, közösségi média",        availability: "Hétköznaponként este" },
        { userId: u13.id, shelterId: deb.id,  status: VolunteerStatus.ACTIVE,   motivation: "Állatjogász vagyok – jogi tanácsadással és fundraisinggel szeretnék segíteni.",   skills: "Jogi tanácsadás, adománygyűjtés",       availability: "Rugalmas" },
        { userId: u14.id, shelterId: pecs.id, status: VolunteerStatus.ACTIVE,   motivation: "Pécsen dolgozom, és a lunch-szüneteket is szívesen töltöm az állatokkal.",        skills: "Etetés, tisztítás, szocializáció",      availability: "Hétköznap 12-13h, hétvége" },
        { userId: u15.id, shelterId: misk.id, status: VolunteerStatus.REJECTED, motivation: "Szerettem volna segíteni, de sajnos messze lakom a menhelytől.",                  skills: "Autóvezetés, szállítás",                availability: "Hétvégén" },
      ],
    });

    // 16. Health records
    await prisma.healthRecord.createMany({
      data: [
        { animalId: animalIds["bodri-bp"],   type: HealthRecordType.VACCINATION, title: "Veszettség elleni oltás",    vetName: "Dr. Nagy Péter",  description: "Éves veszettség elleni oltás + kombinált (Nobivac DHPPi+L4).", date: daysAgo(30), nextDueDate: daysFromNow(335), createdById: shelterAdmins[0].id },
        { animalId: animalIds["rex-bp"],     type: HealthRecordType.CHECKUP,     title: "Éves szűrővizsgálat",        vetName: "Dr. Kiss Anna",   description: "Általános egészségügyi szűrés. Fogkő-eltávolítás elvégezve. Egyéb eltérés nem tapasztalható.", date: daysAgo(60), createdById: shelterAdmins[0].id },
        { animalId: animalIds["luna-bp"],    type: HealthRecordType.TREATMENT,   title: "Felső légúti fertőzés",      vetName: "Dr. Kiss Anna",   description: "Amoxicillin 50 mg / 10 nap. Elkülönítés szükséges.", date: daysAgo(10), nextDueDate: daysFromNow(4), createdById: shelterAdmins[0].id },
        { animalId: animalIds["max-bp"],     type: HealthRecordType.VACCINATION, title: "Kennel kóhogás oltás",       vetName: "Dr. Nagy Péter",  description: "Nobivac KC intranasal. Érvényes 12 hónapig.", date: daysAgo(45), nextDueDate: daysFromNow(320), createdById: shelterAdmins[0].id },
        { animalId: animalIds["bruno-deb"],  type: HealthRecordType.DEWORMING,   title: "Féregtelenítés",             vetName: "Dr. Vass Béla",   description: "Milbemax tabletta. Következő: 3 hónap múlva.", date: daysAgo(20), nextDueDate: daysFromNow(70), createdById: shelterAdmins[1].id },
        { animalId: animalIds["gomboc-gyor"],type: HealthRecordType.TREATMENT,   title: "Foggyulladás kezelése",      vetName: "Dr. Fehér Éva",   description: "Fogeltávolítás elvégezve, antibiotikumos utókezelés. 2 hét után kontroll szükséges.", date: daysAgo(7), nextDueDate: daysFromNow(7), createdById: shelterAdmins[3].id },
        { animalId: animalIds["bella-misk"], type: HealthRecordType.VACCINATION, title: "Kölyökkori alapoltások",     vetName: "Dr. Boros Gábor", description: "Első oltássorozat (DHPPi). 3 hét múlva második oltás szükséges.", date: daysAgo(14), nextDueDate: daysFromNow(7), createdById: shelterAdmins[4].id },
        { animalId: animalIds["cezar-misk"], type: HealthRecordType.CHECKUP,     title: "Félévente szűrővizsgálat",  vetName: "Dr. Boros Gábor", description: "Idős állat szűrése: vérnyomás, cukor, vese. Enyhe ízületi gyulladás, kezelés javasolt.", date: daysAgo(5),  createdById: shelterAdmins[4].id },
      ],
    });

    // 17. Inventory items (for Budapest shelter)
    const invItems = await prisma.inventoryItem.createMany({
      data: [
        { shelterId: bp.id,   name: "Royal Canin Adult Medium",       category: InventoryCategory.FOOD,      unit: "kg",      quantity: 48, minQuantity: 10  },
        { shelterId: bp.id,   name: "Antibiotikum (Amoxicillin 50mg)",category: InventoryCategory.MEDICINE,  unit: "tabletta",quantity: 8,  minQuantity: 20  },
        { shelterId: bp.id,   name: "Kölyöktáp (Hill's Puppy)",       category: InventoryCategory.FOOD,      unit: "kg",      quantity: 15, minQuantity: 5   },
        { shelterId: bp.id,   name: "Fertőtlenítő spray (Virkon S)",  category: InventoryCategory.CLEANING,  unit: "liter",   quantity: 3,  minQuantity: 6   },
        { shelterId: bp.id,   name: "Pórázok (vegyes méret)",         category: InventoryCategory.SUPPLIES,  unit: "db",      quantity: 12                   },
        { shelterId: bp.id,   name: "Macska homok (Catsan)",          category: InventoryCategory.SUPPLIES,  unit: "kg",      quantity: 40, minQuantity: 15  },
        { shelterId: deb.id,  name: "Royal Canin Maxi Adult",         category: InventoryCategory.FOOD,      unit: "kg",      quantity: 60, minQuantity: 15  },
        { shelterId: deb.id,  name: "Vitamin cseppek (Beaphar)",      category: InventoryCategory.MEDICINE,  unit: "üveg",    quantity: 2,  minQuantity: 1   },
        { shelterId: misk.id, name: "Kutyaeledel (száraz)",            category: InventoryCategory.FOOD,      unit: "kg",      quantity: 35, minQuantity: 10  },
        { shelterId: misk.id, name: "Mosószer (Persil, illatmentes)", category: InventoryCategory.CLEANING,  unit: "kg",      quantity: 6,  minQuantity: 2   },
      ],
    });

    return NextResponse.json({
      ok: true,
      message: "Preview seed complete. DELETE this endpoint.",
      counts: {
        shelters: shelters.length,
        shelterAdmins: shelterAdmins.length,
        regularUsers: users.length,
        animals: animalDefs.length,
        campaigns: camps.length,
        events: 5,
        applications: appDefs.length,
        reviews: 12,
        volunteers: 5,
        healthRecords: 8,
        inventoryItems: invItems.count,
      },
      logins: {
        shelterAdmins: "Shelter1234!",
        regularUsers:  "Preview1234!",
        adminEmails: shelterAdmins.map(a => a.email),
        userEmails:  users.map(u => u.email),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
