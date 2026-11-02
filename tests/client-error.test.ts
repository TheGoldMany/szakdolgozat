import { describe, it, expect } from "vitest";
import { userMessage } from "@/lib/client-error";

describe("userMessage", () => {
  const fb = "Valami hiba történt.";
  it("átengedi a magyar, felhasználónak szóló üzenetet", () => {
    expect(userMessage("Ez az email cím már foglalt.", fb)).toBe("Ez az email cím már foglalt.");
    expect(userMessage(new Error("Már nyújtottál be kérelmet ehhez az állathoz"), fb)).toBe("Már nyújtottál be kérelmet ehhez az állathoz");
  });
  it("a technikai szöveg helyett az általános üzenetet adja", () => {
    for (const raw of [
      "Internal server error", "Unauthorized", "Not found",
      "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON", "Failed to fetch",
      "String must contain at least 2 character(s)", "STRIPE_SECRET_KEY environment variable is not set",
      new TypeError("Cannot read properties of undefined (reading 'url')"),
    ]) expect(userMessage(raw, fb)).toBe(fb);
  });
  it("üres vagy hiányzó értéknél az általános üzenet", () => {
    expect(userMessage(undefined, fb)).toBe(fb);
    expect(userMessage("", fb)).toBe(fb);
    expect(userMessage({}, fb)).toBe(fb);
  });
});
