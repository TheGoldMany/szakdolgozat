/**
 * seedNewModules – közös seed logika az új ERP-modulokhoz.
 * Hívja mind a teljes runSeed(), mind a /api/seed/extras végpont.
 *
 * Inputok: meglévő/éppen létrehozott shelterek, állatok, felhasználók listái.
 * Outputok: seedelési statisztika.
 */

import { prisma } from "@/lib/prisma";
import { AnimalStatus, FosterStatus, EventType, EventStatus } from "@prisma/client";
import { slugifyEvent } from "@/lib/event";

// ── Segédfüggvények ───────────────────────────────────────────────────────────

function ri<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rn(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rb(p = 0.5) { return Math.random() < p; }

function rndFuture(minDays = 7, maxDays = 90): Date {
  const d = new Date();
  d.setDate(d.getDate() + rn(minDays, maxDays));
  d.setHours(rn(9, 17), 0, 0, 0);
  return d;
}

// ── Konstansok ────────────────────────────────────────────────────────────────

const BEHAVIOR_NOTES = [
  "Lassan kezd megbízni az emberekben, de még visszahúzódó idegenekkel szemben.",
  "Kiváló szocializáció kutyatársaival, macskákkal még dolgozunk.",
  "Pórázkezelés fejlődik, hiperaktivitás csökkent az elmúlt héten.",
  "Erős kötődés az önkéntesekhez, elválás utáni stressz megfigyelhető.",
  "Kényszeres viselkedés (körök futása) ritkulóban a gazdagítási program óta.",
  "Jól fogadja az érintést, korábban agresszív volt kézközelre.",
  "Táplelékmotiváció magas – tréningre alkalmas, jól koncentrál.",
  "Karantén lezárult, egészséges, készen áll a kennel programra.",
  "Kutyaiskolán részt vett, ül és le parancsot ismeri, pórázon húzás csökkent.",
  "Több mozgás szükséges, szeparációs szorongás tünetei észlelhetők.",
];

const EVENT_TITLES: Record<EventType, string[]> = {
  ADOPTION_DAY:  ["Tavaszi örökbefogadási nap", "Nyári örökbefogadás", "Őszi gazdikeresés", "Téli örökbefogadási nap", "Nagy örökbefogadási vásár"],
  FUNDRAISER:    ["Karácsonyi adománygyűjtés", "Tavaszi jótékonysági est", "Online aukcióval egybekötött gyűjtés"],
  VOLUNTEER_DAY: ["Önkéntes tisztasági nap", "Önkéntes nap a menhely segítségnél", "Menhelyfelújítás önkéntesekkel"],
  OPEN_DAY:      ["Nyílt nap a menhelyen", "Ismerkedj meg velünk!", "Látogatói nap"],
  EDUCATION:     ["Felelős állattartás előadás", "Kutyaviselkedési workshop", "Gazdioktató délelőtt"],
  OTHER:         ["Közösségi piknik az állatokért", "Futóverseny a menhelyért"],
};

const EVENT_DESCS: Record<EventType, string> = {
  ADOPTION_DAY:  "Gyere és találd meg élete társát! Menhelyünk lakói személyesen fogadják az érdeklődőket. Hozd magaddal a személyi igazolványodat. Az örökbefogadás az nap elindítható.",
  FUNDRAISER:    "Minden fillér a gondozási költségek fedezésére fordítódik. Fogadj örökbe szimbolikusan, vásárolj kézműves termékeket, és támogasd az állatok ellátását.",
  VOLUNTEER_DAY: "Segítsd a menhely mindennapi munkáját! Sétáltatás, etetés, takarítás, kerítésfestés – mindenki megtalálja a maga feladatát. Különleges képzés nem szükséges.",
  OPEN_DAY:      "Nézz be és ismerd meg a menhely életét! Bemutatjuk az állatainkat, a gondozást és azt, hogyan lehet velünk aktívan együttműködni.",
  EDUCATION:     "Szakember vezette interaktív előadás felelős állattartásról, viselkedésmegértésről és a menhely munkájáról. Hozd a gyerekeidet is!",
  OTHER:         "Közös program a menhely és a közösség számára. Mindenki szeretettel várva!",
};

const LOCATIONS = [
  "Városliget, Budapest", "Margit-sziget, Budapest", "Helyi park", "Menhely udvara",
  "Művelődési ház nagyelőadója", "Városi sportpálya", "Közösségi kert",
];

interface SeedInput {
  shelters:   { id: string; adminId: string }[];
  allAnimals: { id: string; shelterId: string; status: string; type: string }[];
  allUsers:   { id: string }[];
}

// ── Fő export ─────────────────────────────────────────────────────────────────

export async function seedNewModules({ shelters, allAnimals, allUsers }: SeedInput) {
  const animalsByShelter: Record<string, typeof allAnimals> = {};
  for (const a of allAnimals) {
    (animalsByShelter[a.shelterId] ??= []).push(a);
  }

  let kennelCount       = 0;
  let behaviorLogCount  = 0;
  let fosterCount       = 0;
  let sponsorshipCount  = 0;
  let eventCount        = 0;
  let registrationCount = 0;

  for (const shelter of shelters) {
    const shelterAnimals = animalsByShelter[shelter.id] ?? [];
    const availableAnimals = shelterAnimals.filter(a => a.status === AnimalStatus.AVAILABLE || a.status === "FOSTER");

    // ── 20. Kennelok (2–4 db / menhely) ─────────────────────────────────────
    const kennelTypes = [
      { name: "A-kennel",     type: "KENNEL",     capacity: rn(3, 8) },
      { name: "B-kennel",     type: "KENNEL",     capacity: rn(2, 6) },
      { name: "Macskaszoba",  type: "CAT_ROOM",   capacity: rn(4, 10) },
      { name: "Karantén",     type: "QUARANTINE", capacity: rn(1, 3) },
    ];
    const numKennels = rn(2, 4);
    const createdKennels: { id: string; capacity: number }[] = [];

    for (let ki = 0; ki < numKennels; ki++) {
      const kt = kennelTypes[ki];
      const kennel = await prisma.kennel.create({
        data: { shelterId: shelter.id, name: kt.name, type: kt.type as never, capacity: kt.capacity },
      });
      createdKennels.push({ id: kennel.id, capacity: kt.capacity });
      kennelCount++;
    }

    // Állatok ~40%-a kap kennel-beosztást
    const assignable = shelterAnimals.filter(a => a.status !== "ADOPTED");
    let kennelAnimalIdx = 0;
    for (const kennel of createdKennels) {
      const take = Math.min(Math.floor(kennel.capacity * 0.6), assignable.length - kennelAnimalIdx);
      for (let i = 0; i < take; i++) {
        const animal = assignable[kennelAnimalIdx++];
        if (!animal) break;
        await prisma.animal.update({ where: { id: animal.id }, data: { kennelId: kennel.id } });
      }
    }

    // ── 21. Viselkedési naplók (1–2 bejegyzés / AVAILABLE állat, max 15) ─────
    const logAnimals = availableAnimals.slice(0, 15);
    const behaviorRows: {
      animalId: string; note: string; progressLevel: number | null;
      authorId: string; createdAt: Date;
    }[] = [];

    for (const animal of logAnimals) {
      const numLogs = rn(1, 2);
      for (let li = 0; li < numLogs; li++) {
        const prog = rb(0.6) ? rn(10, 85) : null;
        behaviorRows.push({
          animalId:      animal.id,
          note:          ri(BEHAVIOR_NOTES),
          progressLevel: prog,
          authorId:      shelter.adminId,
          createdAt:     new Date(Date.now() - rn(1, 60) * 86_400_000),
        });
        if (prog !== null) {
          await prisma.animal.update({ where: { id: animal.id }, data: { progressLevel: prog } });
        }
      }
    }
    if (behaviorRows.length > 0) {
      await prisma.behaviorLog.createMany({ data: behaviorRows });
      behaviorLogCount += behaviorRows.length;
    }

    // ── 22. Foster profilok (2–3 / menhely) ─────────────────────────────────
    const shuffledUsers = [...allUsers].sort(() => Math.random() - 0.5).slice(0, rn(2, 3));
    const statuses: FosterStatus[] = ["ACTIVE", "ACTIVE", "PENDING", "INACTIVE"];

    for (const user of shuffledUsers) {
      const status = ri(statuses);
      try {
        await prisma.fosterProfile.create({
          data: {
            userId:        user.id,
            shelterId:     shelter.id,
            status,
            preferredTypes: rb(0.6) ? [ri(["DOG", "CAT", "RABBIT"]) as never] : [],
            maxWeightKg:   rb(0.5) ? rn(5, 30) : null,
            canQuarantine: rb(0.3),
            motivation:    "Szeretném segíteni az állatokat, amíg végleges gazdira találnak.",
          },
        });
        fosterCount++;
      } catch { /* @@unique constraint, skip */ }
    }

    // ── 23. Sponsorships (virtuális örökbefogadás, 3–6 / menhely) ─────────────
    const sponsorAnimals = availableAnimals.slice(0, 6);
    const shuffledSponsors = [...allUsers].sort(() => Math.random() - 0.5);
    let sIdx = 0;

    for (const animal of sponsorAnimals) {
      const numSponsors = rn(1, 3);
      for (let si = 0; si < numSponsors && sIdx < shuffledSponsors.length; si++, sIdx++) {
        const user = shuffledSponsors[sIdx];
        const amount = ri([1000, 2500, 5000, 10000]);
        try {
          await prisma.sponsorship.create({
            data: {
              animalId:    animal.id,
              userId:      user.id,
              amount,
              isPublic:    rb(0.7),
              displayName: rb(0.3) ? "Névtelen jótevő" : null,
              status:      "ACTIVE",
              createdAt:   new Date(Date.now() - rn(1, 90) * 86_400_000),
            },
          });
          sponsorshipCount++;
        } catch { /* skip duplicates */ }
      }
    }

    // ── 24. Események (2–3 / menhely) ────────────────────────────────────────
    const eventTypes: EventType[] = ["ADOPTION_DAY", "ADOPTION_DAY", "OPEN_DAY", "FUNDRAISER", "VOLUNTEER_DAY", "EDUCATION"];
    const numEvents = rn(2, 3);

    for (let ei = 0; ei < numEvents; ei++) {
      const type    = ri(eventTypes);
      const title   = ri(EVENT_TITLES[type]);
      const slug    = `${slugifyEvent(title)}-${shelter.id.slice(-6)}-${ei}-${Date.now()}`;
      const startsAt = rndFuture(rn(3, 45), rn(46, 90));
      const endsAt   = rb(0.7) ? new Date(startsAt.getTime() + rn(2, 6) * 3_600_000) : null;
      const capacity = rb(0.6) ? rn(20, 200) : null;
      const status: EventStatus = rb(0.85) ? "PUBLISHED" : "DRAFT";

      const event = await prisma.event.create({
        data: {
          shelterId:   shelter.id,
          title,
          slug,
          description: EVENT_DESCS[type],
          type,
          location:    ri(LOCATIONS),
          startsAt,
          endsAt,
          capacity,
          status,
        },
      });
      eventCount++;

      // Regisztrációk (0–8 db) published eseményekhez
      if (status === "PUBLISHED") {
        const regUsers = [...allUsers].sort(() => Math.random() - 0.5).slice(0, rn(0, 8));
        for (const user of regUsers) {
          try {
            await prisma.eventRegistration.create({
              data: {
                eventId: event.id,
                userId:  user.id,
                status:  "REGISTERED",
                guests:  rn(0, 3),
              },
            });
            registrationCount++;
          } catch { /* skip */ }
        }
      }
    }
  }

  return {
    kennels:          kennelCount,
    behaviorLogs:     behaviorLogCount,
    fosterProfiles:   fosterCount,
    sponsorships:     sponsorshipCount,
    events:           eventCount,
    eventRegistrations: registrationCount,
  };
}
