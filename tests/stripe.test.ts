import { describe, it, expect } from "vitest";
import { platformFee, PLATFORM_FEE_PERCENT } from "@/lib/stripe";

describe("platformFee", () => {
  it("a platform díj 5%", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(5);
  });

  it("5%-ot számol egész forintra kerekítve", () => {
    expect(platformFee(1000)).toBe(50);
    expect(platformFee(10000)).toBe(500);
    expect(platformFee(5000)).toBe(250);
    expect(platformFee(2500)).toBe(125);
  });

  it("kerekíti a tört eredményt", () => {
    // 1010 * 0.05 = 50.5 → 51
    expect(platformFee(1010)).toBe(51);
    // 1001 * 0.05 = 50.05 → 50
    expect(platformFee(1001)).toBe(50);
    // 1003 * 0.05 = 50.15 → 50
    expect(platformFee(1003)).toBe(50);
  });

  it("nulla összegre nulla díj", () => {
    expect(platformFee(0)).toBe(0);
  });
});
