import { describe, it, expect } from "vitest";
import {
  isHungarianHoliday,
  toDateOnly,
  monthName,
  computeAgeCategory,
  computeStayDurationDays,
  HU_MONTHS,
} from "@/lib/etl-helpers";

describe("computeAgeCategory", () => {
  it("ismeretlen kor esetén UNKNOWN", () => {
    expect(computeAgeCategory(null)).toBe("UNKNOWN");
    expect(computeAgeCategory(undefined)).toBe("UNKNOWN");
  });

  it("6 hónap alatt PUPPY", () => {
    expect(computeAgeCategory(0)).toBe("PUPPY");
    expect(computeAgeCategory(5)).toBe("PUPPY");
  });

  it("6–23 hónap között YOUNG", () => {
    expect(computeAgeCategory(6)).toBe("YOUNG");
    expect(computeAgeCategory(23)).toBe("YOUNG");
  });

  it("24–95 hónap között ADULT", () => {
    expect(computeAgeCategory(24)).toBe("ADULT");
    expect(computeAgeCategory(95)).toBe("ADULT");
  });

  it("96 hónaptól (8 év) SENIOR", () => {
    expect(computeAgeCategory(96)).toBe("SENIOR");
    expect(computeAgeCategory(200)).toBe("SENIOR");
  });
});

describe("isHungarianHoliday", () => {
  it("felismeri a fix ünnepnapokat", () => {
    expect(isHungarianHoliday(new Date(Date.UTC(2026, 0, 1)))).toBe(true);  // jan 1
    expect(isHungarianHoliday(new Date(Date.UTC(2026, 2, 15)))).toBe(true); // márc 15
    expect(isHungarianHoliday(new Date(Date.UTC(2026, 7, 20)))).toBe(true); // aug 20
    expect(isHungarianHoliday(new Date(Date.UTC(2026, 11, 25)))).toBe(true); // dec 25
  });

  it("hétköznapokra false-t ad", () => {
    expect(isHungarianHoliday(new Date(Date.UTC(2026, 5, 2)))).toBe(false);
    expect(isHungarianHoliday(new Date(Date.UTC(2026, 6, 14)))).toBe(false);
  });
});

describe("monthName", () => {
  it("helyes magyar hónapnevet ad", () => {
    expect(monthName(1)).toBe("január");
    expect(monthName(12)).toBe("december");
  });

  it("tartományon kívül üres string", () => {
    expect(monthName(0)).toBe("");
    expect(monthName(13)).toBe("");
  });

  it("HU_MONTHS pontosan 12 elemű", () => {
    expect(HU_MONTHS).toHaveLength(12);
  });
});

describe("toDateOnly", () => {
  it("nullázza az idő-komponenst", () => {
    const result = toDateOnly(new Date("2026-06-01T14:35:22.000Z"));
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("megtartja a dátumot", () => {
    const result = toDateOnly(new Date("2026-06-01T23:59:59.000Z"));
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(5);
    expect(result.getUTCDate()).toBe(1);
  });

  it("nem mutálja az eredeti dátumot", () => {
    const orig = new Date("2026-06-01T14:00:00.000Z");
    toDateOnly(orig);
    expect(orig.getUTCHours()).toBe(14);
  });
});

describe("computeStayDurationDays", () => {
  it("egész napokat számol", () => {
    const intake = new Date("2026-01-01T00:00:00.000Z");
    const adopt  = new Date("2026-01-11T00:00:00.000Z");
    expect(computeStayDurationDays(intake, adopt)).toBe(10);
  });

  it("ugyanaznap 0 nap", () => {
    const d = new Date("2026-01-01T08:00:00.000Z");
    expect(computeStayDurationDays(d, d)).toBe(0);
  });

  it("negatív különbségnél null", () => {
    const intake = new Date("2026-02-01T00:00:00.000Z");
    const adopt  = new Date("2026-01-01T00:00:00.000Z");
    expect(computeStayDurationDays(intake, adopt)).toBeNull();
  });

  it("kerekít a legközelebbi napra", () => {
    const intake = new Date("2026-01-01T00:00:00.000Z");
    const adopt  = new Date("2026-01-01T13:00:00.000Z"); // 13 óra → 1 nap
    expect(computeStayDurationDays(intake, adopt)).toBe(1);
  });
});
