/**
 * Fizetési határértékek és díjszázalékok — szándékosan függőség nélküli fájl.
 *
 * A kliens oldali űrlapok és a szerveroldali validáció ugyanezt a számot
 * használja. Nem a `lib/stripe.ts`-ben van, mert az importálja a Stripe SDK-t,
 * és egy kliens komponensből behúzva az a teljes SDK-t bevinné a böngésző
 * bundle-jébe.
 *
 * A Stripe fix díja (25 Ft) ez alatt aránytalanul nagy részt vinne el: 500
 * Ft-nál a támogatóra terhelt díj ~12%, 100 Ft-nál már 32% lenne. A virtuális
 * örökbefogadás is ezt a határt használja.
 */
export const MIN_DONATION_HUF = 500;

/**
 * A platform részesedése minden fizetésből (adomány, előfizetés, virtuális
 * örökbefogadás).
 *
 * ITT van, és nem a `lib/stripe.ts`-ben, mert a FELÜLET is kiírja: a menhely
 * beállítások oldala ebből mondja meg a százalékot. Korábban a szöveg kézzel
 * beírt „4%"-ot tartalmazott, miközben a kód 5%-ot vont — a menhely tehát mást
 * olvasott, mint ami történt. Egy szám, egy helyen: így nem tud szétcsúszni.
 *
 * FIGYELEM: a díjat NEM a kedvezményezettől vonjuk le. A támogató fizeti a
 * felajánlott összegen FELÜL (a Stripe fizetőoldalán külön sorként látszik),
 * a menhely pedig a teljes felajánlott összeget megkapja. Az előfizetéseknél
 * ugyanez a `subscriptionFeePercent()` számításán keresztül valósul meg.
 */
export const PLATFORM_FEE_PERCENT = 5;

/**
 * Gyűjtés legkisebb célösszege.
 *
 * Eddig CSAK a böngészőben lévő űrlap ellenőrizte (`< 1000` → hibaüzenet), a
 * szerver viszont bármilyen pozitív számot elfogadott. A felületen kiírt
 * szabály tehát nem volt kikényszerítve: a végpontot közvetlenül hívva
 * 1 Ft-os célösszegű gyűjtés is létrejöhetett.
 */
export const MIN_CAMPAIGN_TARGET_HUF = 1000;

/**
 * A Stripe feldolgozási díjának becslése, amit a támogatóra továbbterhelünk.
 *
 * ITT van, és nem a `lib/stripe.ts`-ben, ugyanabból az okból, amiért a
 * `PLATFORM_FEE_PERCENT` is: a fizetési űrlap KIÍRJA a bontást, mielőtt a
 * támogató a Stripe-ra lépne. Ha a böngésző a saját képletével számolná, a
 * kiírt végösszeg és a Stripe-on terhelt összeg szét tudna csúszni — és a
 * támogató pont abban a pillanatban venné észre, amikor a kártyáját adja meg.
 * Egy képlet, egy helyen.
 *
 * FIGYELEM: ez BECSLÉS. A tényleges Stripe-díj a fiók díjszabásától és a
 * kártya típusától függ; ha a valóság több, a különbözetet a platform nyeli el
 * (lásd `docs/18` TC-18-35).
 */
export const STRIPE_PERCENT_FEE   = 1.4; // a terhelt összeg százaléka
export const STRIPE_FIXED_FEE_HUF = 25;  // tranzakciónkénti fix díj

/**
 * A platform része egy adott összegből, egész forintra kerekítve.
 *
 * A díj a felajánlott összegen FELÜL jelenik meg: a támogató
 * `amount + platformFee(amount) + stripeProcessingFee(amount)`-ot fizet, a
 * kedvezményezett pedig a teljes `amount`-ot megkapja.
 */
export function platformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

/** A támogatóra továbbterhelt, becsült Stripe-díj forintban. */
export function stripeProcessingFee(amount: number): number {
  return Math.round((amount * STRIPE_PERCENT_FEE) / 100) + STRIPE_FIXED_FEE_HUF;
}

/** Amit a támogató összesen fizet egy `amount` forintos felajánlásért. */
export function donorTotal(amount: number): number {
  return amount + platformFee(amount) + stripeProcessingFee(amount);
}
