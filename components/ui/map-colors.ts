/**
 * A térkép jelöléseinek színei.
 *
 * Miért külön fájl? A `animal-map.tsx` a Leafletet modulszinten tölti be, az
 * pedig azonnal a `window`-hoz nyúl – ezért csak `dynamic(..., { ssr: false })`
 * mögül használható. A jelmagyarázatnak viszont ugyanezekre a színekre van
 * szüksége, és ha értékként a térkép moduljából importálná őket, a Leaflet
 * bekerülne a szerveroldali csomagba is: a `/map` közvetlen megnyitása
 * `window is not defined` hibával elhasalna, hiába van kikapcsolva az SSR.
 *
 * Itt nincs semmi böngésző-specifikus, így mindkét oldal biztonsággal
 * importálhatja.
 */

export const TYPE_COLOR: Record<string, string> = {
  LOST:  "#EF4444",
  FOUND: "#22C55E",
  STRAY: "#F97316",
};

export const SHELTER_COLOR       = "#2563EB";
export const VET_COLOR           = "#7C3AED";
export const VET_EMERGENCY_COLOR = "#DC2626";
