import { prisma } from "@/lib/prisma";
import { DEFAULT_TIERS, GENERAL_CAMPAIGN, ALLOWED_TIER_AMOUNTS } from "@/lib/donation-tiers";

/** Ékezetek nélküli, URL-barát azonosító a gyűjtés slugjához. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Egy menhely alapértelmezett támogatási felállásának biztosítása:
 * a négy fix havi csomag és az állandó „Általános támogatás" gyűjtés.
 *
 * Idempotens – többször lefuttatva sem hoz létre duplikátumot, így a meglévő
 * menhelyek visszatöltésére is ez fut.
 *
 * A nem szabványos összegű, korábban kézzel létrehozott csomagokat NEM törli,
 * csak inaktívra állítja: a rájuk előfizetők a Stripe-nál a belépéskori árat
 * fizetik tovább, a törlés az előfizetésüket szakítaná meg. Inaktívan a
 * meglévők maradnak, újak viszont nem tudnak belépni.
 */
export async function ensureShelterDefaults(shelterId: string): Promise<{
  tiersCreated:      number;
  legacyDeactivated: number;
  campaignCreated:   boolean;
}> {
  const shelter = await prisma.shelter.findUnique({
    where:  { id: shelterId },
    select: { id: true, name: true, slug: true },
  });
  if (!shelter) return { tiersCreated: 0, legacyDeactivated: 0, campaignCreated: false };

  const existing = await prisma.donationTier.findMany({
    where:  { shelterId },
    select: { id: true, amount: true, isActive: true },
  });

  // Hiányzó fix csomagok pótlása
  const haveAmounts = new Set(existing.map((t) => t.amount));
  const missing     = DEFAULT_TIERS.filter((t) => !haveAmounts.has(t.amount));
  if (missing.length > 0) {
    await prisma.donationTier.createMany({
      data: missing.map((t) => ({
        shelterId,
        name:        t.name,
        description: t.description,
        amount:      t.amount,
      })),
    });
  }

  // Korábbi, egyedi összegű csomagok kivezetése (nem törlés – lásd fent)
  const legacyIds = existing
    .filter((t) => t.isActive && !ALLOWED_TIER_AMOUNTS.includes(t.amount))
    .map((t) => t.id);
  if (legacyIds.length > 0) {
    await prisma.donationTier.updateMany({
      where: { id: { in: legacyIds } },
      data:  { isActive: false },
    });
  }

  // Állandó gyűjtés – enélkül a menhely futó kampány híján nem tud egyszeri
  // adományt fogadni, mert a checkout kötelezően kér campaignId-t.
  const hasGeneral = await prisma.campaign.findFirst({
    where:  { shelterId, isGeneral: true },
    select: { id: true },
  });

  let campaignCreated = false;
  if (!hasGeneral) {
    const base = slugify(`altalanos-tamogatas-${shelter.slug || shelter.name}`);
    let slug   = base;
    for (let i = 2; await prisma.campaign.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${base}-${i}`;
    }

    await prisma.campaign.create({
      data: {
        shelterId,
        title:        GENERAL_CAMPAIGN.title,
        slug,
        description:  GENERAL_CAMPAIGN.description,
        targetAmount: GENERAL_CAMPAIGN.targetAmount,
        status:       "ACTIVE", // rendszer által létrehozott, nem kell jóváhagyás
        isGeneral:    true,
        endsAt:       null,
      },
    });
    campaignCreated = true;
  }

  return {
    tiersCreated:      missing.length,
    legacyDeactivated: legacyIds.length,
    campaignCreated,
  };
}
