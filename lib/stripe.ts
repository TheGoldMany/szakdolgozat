import Stripe from "stripe";

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
  if (!accountId) return null;
  try {
    const account = await getStripe().accounts.retrieve(accountId);
    return account.charges_enabled ? accountId : null;
  } catch {
    // Account doesn't exist / not accessible from this Stripe account
    return null;
  }
}
