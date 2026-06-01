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
