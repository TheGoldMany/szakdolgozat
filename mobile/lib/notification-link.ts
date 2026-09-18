import { Linking } from "react-native";
import { BASE_URL } from "./api";

/**
 * Értesítés → képernyő.
 *
 * Az értesítések `href`-je a WEBES útvonalat tartalmazza, mert a szerver nem
 * tudja, honnan nézik. A mobilnak viszont csak a funkciók egy részéhez van
 * képernyője: a dashboard, az önkéntes- és ideiglenes befogadó-folyamatok, az
 * események és a menhelyprofil egyelőre csak a weben léteznek.
 *
 * Ezért a leképezés KIFEJEZETT felsorolás, nem találgatás. Amihez nincs mobil
 * képernyő, az a böngészőben nyílik meg — így egyetlen értesítés sem zsákutca,
 * és nem visz olyan képernyőre, ami nem arról szól.
 *
 * Ha új mobil képernyő készül, ITT kell felvenni; enélkül némán a böngészőbe
 * kerül a felhasználó, ami működik, de nem az igazi.
 */

/** Azok a webes útvonalak, amikhez van mobil megfelelő. */
const EXACT: Record<string, string> = {
  "/profile":      "/(tabs)/profile",
  "/messages":     "/messages",
  "/applications": "/applications",
  "/appointments": "/appointments",
  "/favorites":    "/favorites",
  "/events":       "/events",
  // Az ismerős-értesítések a webes profil aloldalára mutatnak; a mobilban
  // ennek külön képernyője van.
  "/profile/ismerosok": "/connections",
};

/**
 * Mintázatos útvonalak.
 *
 * Az `/animals/{slug}` azért működik, mert a `/api/animals/{id}` végpont
 * azonosítót ÉS slugot is elfogad — enélkül a mobil nem tudná megnyitni azt,
 * amire az értesítés mutat.
 */
const PREFIXES: { web: string; mobile: (rest: string) => string }[] = [
  { web: "/messages/", mobile: (rest) => `/messages/${rest}` },
  { web: "/animals/",  mobile: (rest) => `/animals/${rest}` },
  // Az esemény-értesítések slugot tartalmaznak; a mobil végpont slugot és
  // azonosítót is elfogad, ezért a slug változtatás nélkül átmehet.
  { web: "/events/",   mobile: (rest) => `/events/${rest}` },
];

export type LinkTarget =
  | { kind: "screen"; path: string }
  | { kind: "web";    url: string }
  | { kind: "none" };

/** Hova visz ez az értesítés? */
export function resolveNotificationLink(href: string | null): LinkTarget {
  if (!href) return { kind: "none" };

  const path = href.split("?")[0].replace(/\/+$/, "") || "/";

  const exact = EXACT[path];
  if (exact) return { kind: "screen", path: exact };

  for (const { web, mobile } of PREFIXES) {
    if (path.startsWith(web)) {
      const rest = path.slice(web.length);
      if (rest) return { kind: "screen", path: mobile(rest) };
    }
  }

  // Nincs mobil megfelelő – a webes oldal viszont létezik.
  return { kind: "web", url: `${BASE_URL}${href}` };
}

/**
 * Megnyitás.
 *
 * A böngészős ágnál szándékosan elnyeljük a hibát: ha nincs böngésző (elvben
 * nem fordul elő), attól még ne omoljon össze az értesítéslista.
 */
export async function openNotification(
  target: LinkTarget,
  navigate: (path: string) => void,
): Promise<void> {
  if (target.kind === "screen") { navigate(target.path); return; }
  if (target.kind === "web") {
    try { await Linking.openURL(target.url); } catch { /* nincs mit tenni */ }
  }
}
