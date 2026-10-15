import { z } from "zod";

/**
 * Kattintható külső hivatkozás — csak `http:` és `https:`.
 *
 * MIÉRT NEM ELÉG A `z.string().url()`: az elfogadja a `javascript:alert(1)`-et
 * (szabványos URL), a React 18 pedig egy ilyen `href`-et kattintáskor
 * LEFUTTAT, a mi domainünkön. A HTML-escape sem segít: az idézőjelet és a
 * kacsacsőrt szökteti, a `javascript:` előtagot nem.
 *
 * Két helyen kell: a bevitelnél (`safeHttpUrl`), és a megjelenítésnél
 * (`safeHref`) is — a már tárolt, régi adatot ugyanis a validáció utólag nem
 * javítja ki, és a CSV-import korábban semmilyen ellenőrzést nem végzett.
 */
export function safeHref(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export const safeHttpUrl = z
  .string()
  .max(500)
  .refine((v) => safeHref(v) !== undefined, "Csak http:// vagy https:// cím adható meg.");
