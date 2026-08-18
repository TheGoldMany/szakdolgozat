import { describe, it, expect } from "vitest";
import {
  platformFee, PLATFORM_FEE_PERCENT, stripeProcessingFee,
  subscriptionFeePercent, subscriptionPlatformFee,
} from "@/lib/stripe";

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

describe("subscriptionFeePercent", () => {
  it("olyan százalékot ad, amivel a menhely a csomag árát kapja meg", () => {
    // A Stripe a százalékot a számla TELJES összegére alkalmazza.
    for (const amount of [500, 1000, 2000, 5000, 10_000, 50_000]) {
      const total   = amount + platformFee(amount) + stripeProcessingFee(amount);
      const pct     = subscriptionFeePercent(amount);
      const appFee  = subscriptionPlatformFee(total, pct);
      const shelter = total - appFee;

      // A két tizedes kerekítés miatt van pár forintos csúszás, de nem több.
      expect(Math.abs(shelter - amount)).toBeLessThanOrEqual(1);
    }
  });

  it("a nagyobb csomagnál arányosan kisebb a százalék (a fix 25 Ft eloszlik)", () => {
    expect(subscriptionFeePercent(500)).toBeGreaterThan(subscriptionFeePercent(50_000));
  });

  it("nulla összegre nulla százalék", () => {
    expect(subscriptionFeePercent(0)).toBe(0);
  });

  it("egy 5 000 Ft-os csomag 12 hónapja alatt a csúszás pár forint", () => {
    const amount = 5000;
    const total  = amount + platformFee(amount) + stripeProcessingFee(amount);
    const pct    = subscriptionFeePercent(amount);
    const yearly = 12 * (total - subscriptionPlatformFee(total, pct));

    expect(Math.abs(yearly - amount * 12)).toBeLessThanOrEqual(12);
  });
});
