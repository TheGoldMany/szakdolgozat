/**
 * Melyik bemutatót látta már a felhasználó?
 *
 * MIÉRT A BÖNGÉSZŐBEN ÉS NEM AZ ADATBÁZISBAN: a nyilvános oldalakat (kezdőlap,
 * állatlista, térkép, események) többségében BEJELENTKEZÉS NÉLKÜL nézik. Egy
 * kijelentkezett látogatónak nincs sora, amibe el lehetne menteni bármit —
 * szerveroldali tárolással tehát épp azok nem kapnának működő „már láttam"
 * jelzést, akiknek a bemutató a leginkább szól.
 *
 * A vezérlőpult bemutatója KIVÉTEL, és marad az adatbázisban
 * (`User.dashboardTourSeen`): az bejelentkezés mögött van, és ott a
 * több eszköz közötti egyezés többet ér, mint a könnyű tárolás.
 *
 * A `localStorage` letiltható vagy tele lehet, és privát ablakban dobhat is —
 * ezért MINDEN hozzáférés try/catch-ben van. Hiba esetén a bemutató egyszerűen
 * újra megjelenik: kellemetlen, de nem törik el tőle semmi.
 */

const KEY = "allatimenhelyek:seen-tours";

type SeenMap = Record<string, number>;

function read(): SeenMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    // Sérült vagy régi alakú tárolt érték: inkább üresnek vesszük, mint hogy
    // egy váratlan alakon később elhasaljunk.
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as SeenMap)
      : {};
  } catch {
    return {};
  }
}

/**
 * Látta-e már EZT a változatot?
 *
 * A verzió azért kell, mert egy bemutató tartalma elavulhat: ha átalakul az
 * oldal, a régi szöveg félrevezet. A verzió emelésével a korábbi nézők is
 * megkapják az újat, anélkül hogy bárki tárolt adatát törölni kellene.
 */
export function hasSeenTour(id: string, version: number): boolean {
  return (read()[id] ?? -1) >= version;
}

export function markTourSeen(id: string, version: number): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: version }));
  } catch {
    // Tele van vagy tiltva – a bemutató legfeljebb újra megjelenik.
  }
}

/** Minden bemutató visszaállítása „még nem láttam" állapotba. */
export function resetSeenTours(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nincs mit tenni.
  }
}
