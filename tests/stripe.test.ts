import { describe, it, expect } from "vitest";
import { platformFee, PLATFORM_FEE_PERCENT } from "@/lib/stripe";

describe("platformFee", () => {
  it("a platform díj 4%", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(4);
  });

  it("4%-ot számol egész forintra kerekítve", () => {
    expect(platformFee(1000)).toBe(40);
    expect(platformFee(10000)).toBe(400);
    expect(platformFee(2500)).toBe(100);
  });

  it("kerekíti a tört eredményt", () => {
    // 1010 * 0.04 = 40.4 → 40
    expect(platformFee(1010)).toBe(40);
    // 1025 * 0.04 = 41 → 41
    expect(platformFee(1025)).toBe(41);
    // 1013 * 0.04 = 40.52 → 41
    expect(platformFee(1013)).toBe(41);
  });

  it("nulla összegre nulla díj", () => {
    expect(platformFee(0)).toBe(0);
  });
});
