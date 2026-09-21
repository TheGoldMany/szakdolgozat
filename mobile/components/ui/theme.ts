/**
 * Közös szín- és méretértékek.
 *
 * Eddig minden képernyő saját `StyleSheet`-jébe be voltak másolva ugyanazok a
 * hexakódok (#2563EB, #F9FAFB, #111827, …). Egy színváltás így kilenc fájl
 * átírását jelentette volna, és az eltérések észrevétlenül csúsztak volna be.
 *
 * Szándékosan sima objektum, nem téma-szolgáltató: a projektnek nincs sötét
 * módja, és egy kontextus-alapú megoldás most csak bonyolítana.
 */
export const colors = {
  /** Elsődleges műveletek, linkek. */
  primary:      "#2563EB",
  primaryDark:  "#1D4ED8",
  primarySoft:  "#DBEAFE",

  danger:       "#EF4444",
  dangerDark:   "#B91C1C",
  dangerSoft:   "#FEE2E2",

  /** Lapháttér és kártyaháttér – a kettő különbsége adja a kártya élét. */
  background:   "#F9FAFB",
  surface:      "#FFFFFF",
  border:       "#E5E7EB",

  text:         "#111827",
  textMuted:    "#6B7280",
  textFaint:    "#9CA3AF",
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
} as const;

/**
 * Minimális érinthető méret.
 *
 * Az Apple 44pt-ot, a Google 48dp-t ajánl. A 44 mindkettőnek megfelel az
 * elfogadható tartományban, és ez az a méret, ami alatt a koppintás gyakran
 * mellémegy — ezért a gombok és listasorok ehhez igazodnak.
 */
export const HIT_SIZE = 44;
