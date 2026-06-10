/**
 * feeding-utils.ts
 * Segédfüggvények az automatikus etetési rend számításához.
 */

export type FeedingFrequency =
  | "ONCE_DAILY"
  | "TWICE_DAILY"
  | "THREE_DAILY"
  | "WEEKLY";

interface CalculateNextRunAtParams {
  /** HH:MM formátumú időpontok tömbje, pl. ["08:00", "18:00"] */
  times: string[];
  frequency: FeedingFrequency;
  /** 0 = Hétfő … 6 = Vasárnap – csak WEEKLY esetén releváns */
  weekDays: number[];
  /** Ettől az időponttól számolunk (alapértelmezett: most) */
  from?: Date;
  /** IANA timezone (alapértelmezett: "Europe/Budapest") */
  timezone?: string;
}

/**
 * Visszaadja a legközelebbi jövőbeli futási időpontot UTC Date-ként.
 *
 * Algoritmus:
 *  1. A `from` időponthoz hozzáad 1 percet ("legalább ennyivel a jövőben").
 *  2. Megkeresi az aznapi times[] elemei közül a legkorábbit, ami még a
 *     minimális időpont után van – figyelembe véve a WEEKLY-nél a weekDays-t.
 *  3. Ha nincs ilyen, lép a következő napra (DAILY) vagy a következő
 *     weekDays-beli napra (WEEKLY), és a times[] első elemét veszi.
 *  4. Legfeljebb 14 napot keres előre, utána hibát dob.
 */
export function calculateNextRunAt(params: CalculateNextRunAtParams): Date {
  const {
    times,
    frequency,
    weekDays,
    from = new Date(),
    timezone = "Europe/Budapest",
  } = params;

  if (times.length === 0) {
    throw new Error("A times tömb nem lehet üres.");
  }

  // Minimum időpont: from + 1 perc
  const minTime = new Date(from.getTime() + 60_000);

  /**
   * Adott naptári naphoz (év, hónap, nap a megadott timezone-ban) és
   * HH:MM időponthoz visszaad egy UTC Date-et.
   */
  function buildCandidate(
    year: number,
    month: number, // 1-based
    day: number,
    hhmm: string
  ): Date {
    const [hhStr, mmStr] = hhmm.split(":");
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);

    // Létrehozunk egy lokális időpontot a megadott timezone-ban
    // Intl.DateTimeFormat segítségével visszaellenőrizzük az eltolást.
    // Egyszerű megközelítés: ISO string + timezone offset kiszámítása.
    const isoStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;

    // Intl alapú offset meghatározás
    const tzOffset = getTzOffsetMs(new Date(isoStr + "Z"), timezone);
    // Az UTC idő = lokális idő - offset
    return new Date(new Date(isoStr + "Z").getTime() - tzOffset);
  }

  /**
   * Visszaadja a timezone UTC-offeset ezredmásodpercben az adott UTC időpontra.
   * Pozitív: UTC+N (pl. Budapest nyáron +7200000).
   */
  function getTzOffsetMs(utcDate: Date, tz: string): number {
    // Formázzuk az időpontot a megadott timezone-ban, majd számítsuk ki az eltérést.
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(utcDate);
    const get = (t: string) =>
      parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);

    const localYear = get("year");
    const localMonth = get("month");
    const localDay = get("day");
    let localHour = get("hour");
    const localMinute = get("minute");
    const localSecond = get("second");

    // Intl néhol 24-et ad vissza éjfélnél
    if (localHour === 24) localHour = 0;

    const localMs = Date.UTC(
      localYear,
      localMonth - 1,
      localDay,
      localHour,
      localMinute,
      localSecond
    );

    return localMs - utcDate.getTime();
  }

  /**
   * A megadott UTC Date-hez tartozó naptári nap adatait adja vissza
   * a kívánt timezone-ban: { year, month (1-based), day, isoWeekDay (0=Hétfő) }
   */
  function getLocalDateParts(utcDate: Date): {
    year: number;
    month: number;
    day: number;
    /** 0=Hétfő, 6=Vasárnap */
    isoWeekDay: number;
  } {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });

    const parts = formatter.formatToParts(utcDate);
    const get = (t: string) =>
      parts.find((p) => p.type === t)?.value ?? "";

    const year = parseInt(get("year"), 10);
    const month = parseInt(get("month"), 10);
    const day = parseInt(get("day"), 10);

    // JS getDay(): 0=Vasárnap … 6=Szombat → ISO: 0=Hétfő … 6=Vasárnap
    // Számítsuk ki a Date-ből: UTC-ben kiszámolt nap a timezone-ban
    const weekdayStr = get("weekday"); // "Mon", "Tue", ...
    const weekdayMap: Record<string, number> = {
      Mon: 0,
      Tue: 1,
      Wed: 2,
      Thu: 3,
      Fri: 4,
      Sat: 5,
      Sun: 6,
    };
    const isoWeekDay = weekdayMap[weekdayStr] ?? 0;

    return { year, month, day, isoWeekDay };
  }

  /** Egy napot ad hozzá a naptári dátumhoz (egyszerűen +86400000 ms UTC-ben). */
  function addDays(utcDate: Date, n: number): Date {
    return new Date(utcDate.getTime() + n * 86_400_000);
  }

  // Rendezzük a times tömböt
  const sortedTimes = [...times].sort();

  // Keresés: max 14 nap
  let cursor = new Date(minTime);

  for (let attempt = 0; attempt < 14 * sortedTimes.length + 1; attempt++) {
    const { year, month, day, isoWeekDay } = getLocalDateParts(cursor);

    // WEEKLY esetén ellenőrizzük, hogy a nap szerepel-e a weekDays-ben
    const dayAllowed =
      frequency !== "WEEKLY" ||
      weekDays.length === 0 ||
      weekDays.includes(isoWeekDay);

    if (dayAllowed) {
      // Megpróbálunk e napon belül időpontot találni
      for (const t of sortedTimes) {
        const candidate = buildCandidate(year, month, day, t);
        if (candidate.getTime() >= minTime.getTime()) {
          return candidate;
        }
      }
    }

    // Lépünk a következő napra
    cursor = addDays(new Date(Date.UTC(year, month - 1, day)), 1);
  }

  throw new Error(
    "Nem sikerült következő futási időpontot találni 14 napon belül."
  );
}
