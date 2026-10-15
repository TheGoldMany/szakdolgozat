import { z } from "zod";

/**
 * Beküldött kép- és fájl-URL csak a saját tárhelyünkről jöhet.
 *
 * MIÉRT
 *
 * Tíz végpont (köztük az ANONIM bejelentés, a profilkép és a napi poszt)
 * tetszőleges `https://` címet elfogadott képként, és azt nyilvános oldalakon
 * jelenítette meg. Ezzel bárki beköthetett egy idegen szerveren lévő képet:
 * minden látogató böngészője letöltötte volna, vagyis a kép gazdája látta
 * volna az összes látogató IP-címét és idejét (követőpixel), a kép pedig
 * bármikor kicserélhető lett volna moderálatlan tartalomra.
 *
 * A feltöltő komponensek mind a Vercel Blobba töltenek, onnan pedig mindig
 * `https://<tár>.public.blob.vercel-storage.com/...` alakú cím jön vissza.
 * Jogos esetben tehát más host nem fordul elő.
 *
 * Ugyanez érvényes a DOKUMENTUMOKRA és CSATOLMÁNYOKRA: egy csevegésben vagy
 * egy örökbefogadási kérelemben megjelenő külső letöltési link adathalász-
 * felület lenne („töltsd le a szerződést" → kártevő).
 */
const OWN_IMAGE_HOST = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i;

export function isOwnImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && OWN_IMAGE_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

const MESSAGE = "A képet a feltöltővel add meg — külső hivatkozás nem fogadható el.";

/** Kötelező saját kép. */
export const ownImageUrl = z.string().max(2000).refine(isOwnImageUrl, MESSAGE);

/** Opcionális saját kép: az üres szöveg és a `null` is „nincs kép". */
export const optionalOwnImageUrl = z
  .union([z.literal(""), z.null(), ownImageUrl])
  .optional();
