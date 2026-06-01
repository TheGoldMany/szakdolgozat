import Stripe from "stripe";

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
