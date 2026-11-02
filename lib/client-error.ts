/**
 * Mit mutassunk a felhasználónak egy sikertelen kérés után?
 *
 * Az API-k többsége magyar, a felhasználónak szóló hibaüzenetet ad vissza, de
 * vannak technikai szövegek is: a keretrendszer és a külső szolgáltatások
 * angol üzenetei („Internal server error”, „Unauthorized”, Stripe/Prisma
 * hibák), a zod alapértelmezett angol üzenetei, vagy a böngészőé
 * („Failed to fetch”, „Unexpected token '<'” egy HTML hibaoldal JSON-ként
 * olvasásakor). Ezek semmit nem mondanak a látogatónak, ezért helyettük a
 * hívó által adott, lefordított általános üzenet jelenik meg.
 */
const TECHNICAL = new RegExp(
  [
    "internal server error", "unauthorized", "forbidden", "not found", "bad request",
    "unexpected (token|end)", "failed to fetch", "networkerror", "load failed",
    "is not valid json", "syntaxerror", "typeerror", "cannot read", "undefined", "null",
    "prisma", "stripe", "environment variable", "econn", "timeout",
    // zod alapértelmezett üzenetei
    "string must", "number must", "array must", "expected ", "invalid_", "required",
    "character\\(s\\)", "invalid (input|type|enum|date|email|url)",
  ].join("|"),
  "i",
);

export function userMessage(raw: unknown, fallback: string): string {
  const msg = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : "";
  const text = msg.trim();
  if (!text || text.length > 240 || TECHNICAL.test(text)) return fallback;
  return text;
}
