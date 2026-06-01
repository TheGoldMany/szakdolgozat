// -------------------------------------------------------
// ETL tiszta (pure) segédfüggvények – egységtesztelhetők
// -------------------------------------------------------

export const HU_MONTHS = [
  "január", "február", "március", "április", "május", "június",
  "július", "augusztus", "szeptember", "október", "november", "december",
] as const;

// Magyar törvényes ünnepnapok (fix dátumúak, MM-DD)
export const HU_FIXED_HOLIDAYS = new Set([
  "01-01", // Újév
  "03-15", // Nemzeti ünnep
  "05-01", // A munka ünnepe
  "08-20", // Államalapítás
  "10-23", // Nemzeti ünnep
  "11-01", // Mindenszentek
  "12-25", // Karácsony
  "12-26", // Karácsony másnapja
]);

/** Igaz, ha a dátum fix magyar törvényes ünnepnap. */
export function isHungarianHoliday(d: Date): boolean {
  const mmdd = `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return HU_FIXED_HOLIDAYS.has(mmdd);
}

/** A dátum idő-komponensét nullázza (UTC nap kezdete). */
export function toDateOnly(dt: Date): Date {
  const d = new Date(dt);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Magyar hónapnév (1–12 → "január" … "december"). */
export function monthName(month1to12: number): string {
  return HU_MONTHS[month1to12 - 1] ?? "";
}

/**
 * Korosztály az állat életkorából (hónapokban).
 * PUPPY < 6 hó, YOUNG < 24 hó, ADULT < 96 hó (8 év), különben SENIOR.
 */
export function computeAgeCategory(ageMonths: number | null | undefined): string {
  if (ageMonths == null) return "UNKNOWN";
  if (ageMonths < 6)  return "PUPPY";
  if (ageMonths < 24) return "YOUNG";
  if (ageMonths < 96) return "ADULT";
  return "SENIOR";
}

/**
 * Menhelyen töltött napok száma a befogadástól az örökbefogadásig.
 * Negatív különbség (hibás adat) esetén null.
 */
export function computeStayDurationDays(intakeDate: Date, adoptDate: Date): number | null {
  const diffMs = adoptDate.getTime() - intakeDate.getTime();
  return diffMs >= 0 ? Math.round(diffMs / 86_400_000) : null;
}
