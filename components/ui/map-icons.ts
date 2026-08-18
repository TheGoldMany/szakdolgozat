/**
 * Térkép-jelölők ikonkészlete.
 *
 * A jelölő két dolgot mond el egyszerre:
 *   • a szín és az alak azt, hogy MI ez (bejelentés / menhely / állatorvos),
 *   • a benne lévő ikon azt, hogy MIRŐL szól (kutya, macska, ház, kereszt…).
 *
 * Fontos: a részletek (szem, orr, szív) NEM fehér rárajzolt alakzatok, hanem
 * `fill-rule="evenodd"` lyukak ugyanabban a path-ban. Fehér rárajzolás a fehér
 * ikonon láthatatlan lenne; a kivágás viszont bármilyen háttéren működik — a
 * színes jelölőn és a jelmagyarázat korongján egyaránt. Emiatt egy alakzat és a
 * hozzá tartozó lyukak mindig egyetlen `<path>` elemben vannak.
 *
 * Az ikonok tömör sziluettek: 16–19 px-en is olvashatók, ellentétben a vékony
 * vonalas ikonokkal, amik ebben a méretben elmosódnak. Minden `viewBox` 0 0 24 24.
 */

/**
 * Kutyafej. A fülek szándékosan külön ellipszisek, épphogy érintve a fejet: így
 * a sziluettnek három jól elkülönülő karéja van, és nem mosódik egyetlen foltba.
 * A lelógó fül különbözteti meg a macska hegyes fülétől.
 */
const DOG =
  `<ellipse cx="3.8" cy="12.4" rx="2.6" ry="4.9" transform="rotate(-14 3.8 12.4)"/>` +
  `<ellipse cx="20.2" cy="12.4" rx="2.6" ry="4.9" transform="rotate(14 20.2 12.4)"/>` +
  `<path fill-rule="evenodd" d="` +
    `M12 4c3.4 0 5.6 2.2 5.6 5.6v3.2c0 4-2.5 7.4-5.6 7.4s-5.6-3.4-5.6-7.4V9.6C6.4 6.2 8.6 4 12 4Z` +
    `M8.8 10.7a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0Z` +
    `M12.9 10.7a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0Z` +
    `M12 13.3c1.6 0 2.7.9 2.7 2 0 1.6-1.2 2.8-2.7 2.8s-2.7-1.2-2.7-2.8c0-1.1 1.1-2 2.7-2Z` +
    `M10.9 15a1.1 .85 0 1 0 2.2 0 1.1 .85 0 1 0-2.2 0Z` +
  `"/>`;

/** Macskafej: hegyes fülek, keskeny arc. */
const CAT =
  `<path fill-rule="evenodd" d="` +
    `M3.1 2.9 7.4 7.6a8.6 8.6 0 0 1 9.2 0l4.3-4.7v8.5a8.9 8.9 0 1 1-17.8 0Z` +
    `M7.85 11.8a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0Z` +
    `M13.85 11.8a1.15 1.15 0 1 0 2.3 0 1.15 1.15 0 1 0-2.3 0Z` +
    `M12 14.6c1 0 1.7.5 1.7 1.2 0 .8-.8 1.5-1.7 1.5s-1.7-.7-1.7-1.5c0-.7.7-1.2 1.7-1.2Z` +
  `"/>`;

/** Mancs: négy ujjpárna és a talppárna – az „egyéb állat" jele. */
const PAW =
  `<ellipse cx="5.8" cy="10.2" rx="2.5" ry="3.2"/><ellipse cx="18.2" cy="10.2" rx="2.5" ry="3.2"/>` +
  `<ellipse cx="10" cy="5" rx="2.3" ry="3"/><ellipse cx="14" cy="5" rx="2.3" ry="3"/>` +
  `<path d="M12 12.2c3.4 0 6.2 2.6 6.2 5.6 0 2.2-1.7 3.6-3.7 3.6-1.1 0-1.8-.4-2.5-.4s-1.4.4-2.5.4c-2 0-3.7-1.4-3.7-3.6 0-3 2.8-5.6 6.2-5.6Z"/>`;

/** Menhely: nyeregtetős ház, a falba vágott szívvel. */
const SHELTER =
  `<path fill-rule="evenodd" d="` +
    `M12 1.6 1.2 10.7h3.1v11.7h15.4V10.7h3.1L12 1.6Z` +
    `M12 20.6 11.3 20c-2.6-2.3-4.3-3.9-4.3-5.8 0-1.5 1.2-2.7 2.8-2.7.8 0 1.7.4 2.2 1 .6-.6 1.4-1 2.2-1 1.6 0 2.8 1.2 2.8 2.7 0 1.9-1.7 3.4-4.3 5.8l-.7.6Z` +
  `"/>`;

/** Állatorvosi rendelő: kereszt – a rendelő nemzetközi jele. */
const VET = `<path d="M9.4 2.4h5.2v7h7v5.2h-7v7H9.4v-7h-7V9.4h7v-7Z"/>`;

/** Ügyeleti ellátás: EKG-hullám – önálló jel, nem a keresztre rajzolva. */
const VET_EMERGENCY = `<path d="M1.6 10.9h4.9l2-4.9a1.3 1.3 0 0 1 2.4 0l3 8 1.5-3.5a1.3 1.3 0 0 1 1.2-.8h5.8v2.6h-4.9l-2.4 5.7a1.3 1.3 0 0 1-2.4 0l-3-8-1.3 3a1.3 1.3 0 0 1-1.2.8H1.6Z"/>`;

export const MAP_GLYPHS = {
  DOG, CAT, PAW, SHELTER, VET, VET_EMERGENCY,
} as const;

export type MapGlyph = keyof typeof MAP_GLYPHS;

/** A bejelentés állatfajához tartozó ikon; ismeretlen fajnál mancs. */
export function glyphForAnimal(animalType: string): MapGlyph {
  if (animalType === "DOG") return "DOG";
  if (animalType === "CAT") return "CAT";
  return "PAW";
}

/** Inline SVG a megadott mérettel – jelölőbe és jelmagyarázatba egyaránt. */
export function glyphSvg(glyph: MapGlyph, size: number, color = "#fff"): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true">${MAP_GLYPHS[glyph]}</svg>`;
}

/**
 * Csepp alakú jelölő HTML-je (bejelentések). A térképkomponensek `L.divIcon`-ba
 * csomagolják — itt csak a jelölő kinézete van, Leaflet-függőség nélkül.
 */
export function pinHtml(color: string, glyph: MapGlyph, size = 34): string {
  return `<div style="width:${size}px;height:${size}px;position:relative">
    <div style="position:absolute;inset:0;border-radius:50% 50% 50% 0;background:${color};
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);transform:rotate(-45deg)"></div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
      ${glyphSvg(glyph, Math.round(size * 0.53))}
    </div>
  </div>`;
}

/** Kerek vagy lekerekített négyzet jelölő HTML-je (menhely, állatorvos). */
export function badgeHtml(color: string, glyph: MapGlyph, radius: string, size: number): string {
  return `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:${color};
    border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center">
    ${glyphSvg(glyph, Math.round(size * 0.56))}
  </div>`;
}
