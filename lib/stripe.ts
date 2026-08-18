import Stripe from "stripe";

// A kliens is használja, ezért külön, függőségmentes fájlban él.
export { MIN_DONATION_HUF } from "@/lib/donation-limits";

/**
 * A bankkivonaton megjelenő megnevezés utótagja.
 *
 * A „nem ismerem fel ezt a tételt" a visszaterhelések első számú oka, és
 * destination charge-nál a visszaterhelés a PLATFORM egyenlegét üti – ezért ez
 * nem kozmetika, hanem kockázatcsökkentés.
 *
 * Miért utótag (`statement_descriptor_suffix`) és nem teljes descriptor? Ha a
 * Stripe-fiókon be van állítva előtag, a teljes `statement_descriptor` átadása
 * hibát dob. Az utótag mindkét esetben működik: előtaggal összefűződik,
 * anélkül a fiók alapértelmezettjéhez adódik.
 *
 * FONTOS: a fiókszintű előtagot a Stripe Dashboardon kell beállítani
 * (Settings → Business → Public details). Előfizetéseknél a Stripe kizárólag
 * azt használja, mert a `subscription_data` nem fogad descriptort.
 *
 * Stripe korlátok: rövid, ékezet nélküli, a < > \\ ' " * karakterek tiltottak.
 */
export const STATEMENT_SUFFIX = "MENHELY";

/**
 * Bankkivonatra alkalmas szöveg: ékezetek nélkül, csak betű/szám/szóköz,
 * a Stripe hosszkorlátjára vágva.
 */
export function toStatementSuffix(text: string): string {
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  return clean.length >= 5 ? clean : STATEMENT_SUFFIX;
}

/**
 * Platform fee taken from every payment (donations + subscriptions).
 * The remainder is transferred in full to the connected account (shelter /
 * campaign owner). Change this single value to adjust the platform's cut.
 */
export const PLATFORM_FEE_PERCENT = 5;

/**
 * Stripe processing fee rates for HUF payments.
 * Used to pass the processing cost through to the payer transparently.
 */
export const STRIPE_PERCENT_FEE      = 1.4;  // % of charge amount
export const STRIPE_FIXED_FEE_HUF    = 25;   // flat HUF per transaction

/**
 * Platform fee for a given amount, in the same whole-currency unit (HUF).
 * Rounded to whole forints so charges stay valid for HUF.
 *
 * The fee is added on top of the donor's intended amount: the donor pays
 * `amount + platformFee(amount)`, the connected account receives the full
 * `amount`, and the platform keeps the fee.
 */
export function platformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

/**
 * Estimated Stripe processing fee passed through to the payer, in HUF.
 * Applied to the donation/subscription amount (not the grossed-up total)
 * as a transparent approximation.
 */
export function stripeProcessingFee(amount: number): number {
  return Math.round(amount * STRIPE_PERCENT_FEE / 100) + STRIPE_FIXED_FEE_HUF;
}

/**
 * Az előfizetésekre alkalmazott `application_fee_percent`.
 *
 * Egyszeri adománynál fix összeget adunk át (`application_fee_amount`), havi
 * díjnál viszont a Stripe csak százalékot fogad el, és azt a számla TELJES
 * összegére alkalmazza. Ezért a százalékot úgy kell megválasztani, hogy
 *
 *     (platform díj + feldolgozási díj) / (összeg + mindkét díj)
 *
 * legyen — így a menhely pontosan a csomag árát kapja meg. A Stripe két
 * tizedesig fogadja el, innen a pár filléres csúszás (12 hónap alatt ~3 Ft egy
 * 5 000 Ft-os csomagnál).
 *
 * Ugyanezt használja a checkout és a megújítások könyvelése is, hogy a
 * kiszámolt és a ténylegesen levont díj ne tudjon szétcsúszni.
 */
export function subscriptionFeePercent(amount: number): number {
  // Nulla vagy negatív alapösszegnél a fix 25 Ft egyedül maradna a számlálóban,
  // és 100%-ot adna vissza – vagyis a kedvezményezett nem kapna semmit. A
  // minimumok ezt kizárják, de rossz kimenetel egy díjszámolóban.
  if (amount <= 0) return 0;

  const fee    = platformFee(amount);
  const stripe = stripeProcessingFee(amount);
  const total  = amount + fee + stripe;
  if (total <= 0 || fee + stripe <= 0) return 0;
  return Math.round(((fee + stripe) / total) * 10000) / 100;
}

/** A `subscriptionFeePercent` szerinti platform-rész egy adott számlaösszegből. */
export function subscriptionPlatformFee(totalPaid: number, feePercent: number): number {
  return Math.round((totalPaid * feePercent) / 100);
}

// Lazy singleton – only instantiated on first use, never at build time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    // Defensive: strip surrounding quotes and whitespace that can sneak in
    // when pasting the value into a hosting provider's env var UI. A literal
    // leading/trailing quote or newline makes Stripe reject the key as invalid.
    const key = raw.trim().replace(/^['"]+|['"]+$/g, "");
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Resolve a usable Connect transfer destination.
 *
 * A shelter may have `stripeOnboardingComplete = true` in our DB while its
 * stored `acct_…` id no longer exists in Stripe (e.g. seed/test data, or an
 * account created in a different Stripe account). Passing such an id to
 * `transfer_data.destination` makes Stripe throw "No such destination".
 *
 * This verifies the account actually exists and can accept charges. If not,
 * it returns null so the caller charges the platform account directly instead
 * of crashing the checkout.
 */
export async function resolveTransferDestination(
  accountId: string | null | undefined
): Promise<string | null> {
  if (!accountId) {
    console.log("[stripe] resolveTransferDestination: no accountId");
    return null;
  }
  try {
    const account = await getStripe().accounts.retrieve(accountId);
    console.log(`[stripe] resolveTransferDestination: ${accountId} → charges_enabled=${account.charges_enabled} details_submitted=${account.details_submitted}`);
    // For destination charges the platform creates the charge and Stripe
    // automatically transfers funds. details_submitted is the real gate;
    // charges_enabled only blocks *direct* charges on the connected account.
    if (!account.details_submitted) {
      console.log(`[stripe] resolveTransferDestination: rejected – details not submitted`);
      return null;
    }
    return accountId;
  } catch (err) {
    console.log(`[stripe] resolveTransferDestination: error retrieving ${accountId}:`, err);
    return null;
  }
}
