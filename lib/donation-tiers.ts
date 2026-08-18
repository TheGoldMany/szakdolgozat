/**
 * A havi támogatói csomagok platformszinten rögzített összegei.
 *
 * Miért fix, és nem menhelyenként szabad?
 *   • A Stripe-előfizetés a belépéskori árhoz van kötve (beégetett `price_data`),
 *     ezért egy utólag átírt összeg a meglévő előfizetőket nem érné el – a
 *     felület és a tényleges terhelés csendben szétcsúszna.
 *   • Csomagok nélkül a menhely oldalán meg sem jelent az előfizetés blokk, így
 *     egy frissen jóváhagyott menhely alapból nem tudott havi támogatót szerezni.
 *
 * Az 1‑2‑5 létra (mint a bankjegyeknél) bevett adományozási skála. Az 1 000 Ft-os
 * alsó szint a díjmatek miatt is védhető: alatta a Stripe fix 25 Ft-ja
 * aránytalanul nagy ráterhelést okoz (500 Ft-nál már 11,4%).
 *
 * A NÉV és a LEÍRÁS viszont menhelyenként szerkeszthető marad – a csomag értékét
 * a történet adja („2 000 Ft = egy hét kutyatáp"), nem a szám.
 *
 * Függőségmentes fájl: a kliens oldali űrlapok is importálják.
 */

export interface TierDefinition {
  amount:      number;
  name:        string;
  description: string;
}

export const DEFAULT_TIERS: readonly TierDefinition[] = [
  {
    amount:      1000,
    name:        "Napi falat",
    description: "Havi 1 000 Ft-tal hozzájárulsz az állatok napi etetéséhez.",
  },
  {
    amount:      2000,
    name:        "Heti táp",
    description: "Havi 2 000 Ft nagyjából egy hét tápot fedez néhány lakónknak.",
  },
  {
    amount:      5000,
    name:        "Havi ellátás",
    description: "Havi 5 000 Ft-tal egy állat ellátásának jelentős részét vállalod.",
  },
  {
    amount:      10000,
    name:        "Teljes gondoskodás",
    description: "Havi 10 000 Ft-tal egy állat teljes havi ellátását támogatod.",
  },
] as const;

/** A megengedett csomagösszegek – az API ehhez validál. */
export const ALLOWED_TIER_AMOUNTS: readonly number[] = DEFAULT_TIERS.map((t) => t.amount);

export function isAllowedTierAmount(amount: number): boolean {
  return ALLOWED_TIER_AMOUNTS.includes(amount);
}

/** Az automatikusan létrehozott, állandó gyűjtés címe és szövege. */
export const GENERAL_CAMPAIGN = {
  title: "Általános támogatás",
  description:
    "Egyszeri adomány a menhely mindennapi működésére: táp, alom, oltás, " +
    "állatorvosi ellátás és rezsi. Minden forint közvetlenül az itt élő " +
    "állatokhoz kerül.",
  /**
   * Névleges célösszeg. Az állandó gyűjtésnek nincs valódi célja, a haladásjelző
   * nála nincs kirajzolva – de a mező kötelező, és a nullával való osztás a
   * százalékszámításnál végtelent adna.
   */
  targetAmount: 1_000_000,
} as const;
