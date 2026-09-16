import { prisma } from "@/lib/prisma";

/**
 * Publikus API-alakok: mit adunk ki bejelentkezés nélkül.
 *
 * Ez a fájl azért van, mert a „mit szabad kiadni" döntés EGY helyre tartozik.
 * A `Shelter` sor tartalmaz bankszámlaszámot, adószámot és Stripe-fiókazonosítót
 * is — egy `include`-dal vagy a teljes sor visszaadásával ezek kiszivárognának.
 * Ezért mindenhol KIFEJEZETT `select` van, felsorolva, nem kizárva: ha a sémába
 * új érzékeny mező kerül, az itt nem jelenik meg automatikusan.
 *
 * Az `Animal`-nál ugyanez a helyzet a `flags` mezővel, ami a séma szerint
 * „belső, csak adminoknak látható kockázati címkék", továbbá a `kennelId`,
 * `fosterId` és `progressLevel` belső adatokkal.
 */

/** Egy azonosító lehet cuid vagy slug — a mobil id-t, a web slugot használ. */
export function idOrSlug(value: string) {
  return { OR: [{ id: value }, { slug: value }] };
}

const ANIMAL_PUBLIC_SELECT = {
  id: true, slug: true, name: true, type: true, breed: true, age: true,
  size: true, gender: true, color: true, weight: true, description: true,
  status: true, arrivedAt: true, adoptedAt: true, createdAt: true,
  isVaccinated: true, isNeutered: true, isMicrochipped: true,
  isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: true,
  shelterId: true,
  images:  { select: { url: true, alt: true, isPrimary: true }, orderBy: { isPrimary: "desc" as const } },
  shelter: { select: { id: true, name: true, city: true, slug: true } },
} as const;

const SHELTER_PUBLIC_SELECT = {
  id: true, slug: true, name: true, description: true,
  address: true, city: true, zipCode: true, country: true,
  phone: true, email: true, website: true,
  logoUrl: true, coverUrl: true,
  isVerified: true, lat: true, lng: true,
  adoptionRequirements: true,
} as const;

/**
 * Az állat publikus alakja.
 *
 * A három egészségügyi jelzőt ÁTNEVEZZÜK: az adatbázisban `isVaccinated`,
 * `isNeutered`, `isMicrochipped`, a mobilkliens viszont `vaccinated`,
 * `neutered`, `chipped` néven kéri. A Prisma-sor közvetlen visszaadásával
 * ezek a mezők `undefined`-ként érkeznének meg, és az app csendben azt
 * mutatná, hogy egyik sincs meg.
 */
export async function publicAnimal(idOrSlugValue: string) {
  const animal = await prisma.animal.findFirst({
    where:  idOrSlug(idOrSlugValue),
    select: ANIMAL_PUBLIC_SELECT,
  });
  if (!animal) return null;

  const { isVaccinated, isNeutered, isMicrochipped, ...rest } = animal;
  return {
    ...rest,
    vaccinated: isVaccinated,
    neutered:   isNeutered,
    chipped:    isMicrochipped,
  };
}

/** Aktív menhelyek publikus listája, névsorban. */
export async function publicShelters(limit = 500) {
  return prisma.shelter.findMany({
    where:   { isActive: true },
    select:  SHELTER_PUBLIC_SELECT,
    orderBy: { name: "asc" },
    take:    limit,
  });
}

/**
 * Egy menhely publikus alakja.
 *
 * Inaktív menhelyet nem adunk ki: a listából is kimarad, tehát ha itt
 * kiadnánk, a közvetlen hivatkozás megkerülné a szűrést.
 */
export async function publicShelter(idOrSlugValue: string) {
  return prisma.shelter.findFirst({
    where:  { isActive: true, ...idOrSlug(idOrSlugValue) },
    select: SHELTER_PUBLIC_SELECT,
  });
}
