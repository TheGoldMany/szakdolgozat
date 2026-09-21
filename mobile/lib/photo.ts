import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";
import { upload } from "@vercel/blob/client";
import { ApiError, BASE_URL } from "./api";

/**
 * Fotózás és feltöltés.
 *
 * Ez az app fő mobil-előnye: a helyszínen készült kép egy koppintással
 * felkerül, míg a weben ehhez át kell menni egy másik eszközre.
 *
 * A FELTÖLTÉS PROTOKOLLJA: a `/api/upload` NEM multipart űrlapot fogad, hanem a
 * Vercel Blob kliens-token folyamatát (`handleUpload`). Vagyis nincs „mezőnév":
 * a kliens előbb tokent kér a saját szerverünktől, majd a fájlt közvetlenül a
 * tárolóba tölti. Ezért kell a mobilnak is a `@vercel/blob` csomag — nem lehet
 * kézzel összerakott POST-tal helyettesíteni.
 *
 * A szerver oldali korlátok (app/api/upload/route.ts):
 *   • engedélyezett típusok: image/jpeg, image/png, image/webp, image/gif
 *   • legfeljebb 5 MB
 * Ezeket itt is betartatjuk, hogy a felhasználó ne a feltöltés végén tudja meg.
 */

/** A szerver által elfogadott képtípusok. */
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Tömörítés: a telefonok kamerája 5 MB fölötti képeket is készít, a szerver
 * viszont ennyinél nem fogad többet. A 0.7-es minőség fotónál szemre alig
 * észrevehető, a méretet viszont jellemzően a töredékére viszi.
 */
const QUALITY = 0.7;

export type PhotoSource = "camera" | "library";

export interface PickedPhoto {
  uri:      string;
  mimeType: string;
  fileName: string;
}

/**
 * Engedélykérés, megtagadás-kezeléssel.
 *
 * Az app NEM akadhat el, ha valaki nemet mond. Két eset van:
 *   • egyszerű elutasítás — újra lehet kérni, ezért csak jelezzük;
 *   • végleges elutasítás (`canAskAgain === false`) — innen csak a rendszer
 *     beállításaiban lehet visszavonni, ezért oda küldjük.
 * Mindkét esetben marad a másik forrás (galéria, illetve kamera).
 */
async function ensurePermission(source: PhotoSource): Promise<boolean> {
  const result = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (result.granted) return true;

  const what = source === "camera" ? "kamerához" : "fotóidhoz";
  const alternative = source === "camera"
    ? "Választhatsz képet a galériából is."
    : "Készíthetsz új képet a kamerával is.";

  if (result.canAskAgain) {
    Alert.alert(
      "Nincs hozzáférés",
      `Nem adtál hozzáférést a ${what}. ${alternative}`,
    );
    return false;
  }

  Alert.alert(
    "A hozzáférés le van tiltva",
    `A ${what} való hozzáférést korábban letiltottad. ${alternative} `
    + "Ha mégis használnád, a rendszer beállításaiban engedélyezheted.",
    [
      { text: "Rendben", style: "cancel" },
      { text: "Beállítások", onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

/**
 * Kép választása kamerával vagy a galériából.
 *
 * `null`-t ad, ha nincs engedély vagy a felhasználó megszakította — ez nem
 * hiba, ezért nem dobunk: a hívónak ilyenkor egyszerűen nincs teendője.
 */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  if (!(await ensurePermission(source))) return null;

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes:    ["images"],
    quality:       QUALITY,
    allowsEditing: true,
  };

  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  // A kamera néha nem ad mimeType-ot; ilyenkor a JPEG a biztos tipp, mert a
  // beépített kamera azt készít, és a szerver is elfogadja.
  const mimeType = asset.mimeType ?? "image/jpeg";
  const fileName = asset.fileName ?? `kep-${Date.now()}.jpg`;

  return { uri: asset.uri, mimeType, fileName };
}

/**
 * A kiválasztott kép feltöltése a meglévő `/api/upload` végponton.
 *
 * @param endpoint melyik feltöltő útvonal – a bejelentés és a napi kép is az
 *   általánosat használja, de a végpontok külön jogosultságot ellenőriznek.
 * @returns a feltöltött kép nyilvános címe
 */
export async function uploadPhoto(
  photo: PickedPhoto,
  endpoint: "/api/upload" | "/api/upload/attachment" = "/api/upload",
): Promise<string> {
  if (!ALLOWED.includes(photo.mimeType)) {
    throw new ApiError("client", null,
      "Ezt a képformátumot nem fogadjuk el. Használj JPEG, PNG, WebP vagy GIF képet.");
  }

  // A helyi fájlból Blob: a feltöltő bináris tartalmat vár, a választó viszont
  // csak egy `file://` címet ad vissza.
  let blob: Blob;
  try {
    const response = await fetch(photo.uri);
    blob = await response.blob();
  } catch {
    throw new ApiError("client", null, "A képet nem sikerült beolvasni.");
  }

  if (blob.size > MAX_BYTES) {
    const mb = (blob.size / 1024 / 1024).toFixed(1);
    throw new ApiError("client", null,
      `A kép túl nagy (${mb} MB). A feltölthető méret legfeljebb 5 MB.`);
  }

  try {
    const result = await upload(photo.fileName, blob, {
      access:          "public",
      handleUploadUrl: `${BASE_URL}${endpoint}`,
      contentType:     photo.mimeType,
    });
    return result.url;
  } catch (err) {
    // A feltöltés a tárolóval beszél, nem a saját szerverünkkel, ezért a
    // hibája nem ApiError – egységes alakra hozzuk, hogy a felület ugyanúgy
    // tudja kezelni, mint bármely más hibát.
    throw new ApiError("server", null,
      err instanceof Error && err.message
        ? `A feltöltés nem sikerült: ${err.message}`
        : "A feltöltés nem sikerült.");
  }
}

/**
 * Egy lépésben: választás és feltöltés.
 *
 * `null`, ha a felhasználó megszakította vagy nem adott engedélyt — a hívónak
 * ilyenkor nincs teendője, hibaüzenetet sem kell mutatnia.
 */
export async function pickAndUpload(
  source: PhotoSource,
  endpoint?: "/api/upload" | "/api/upload/attachment",
): Promise<string | null> {
  const photo = await pickPhoto(source);
  if (!photo) return null;
  return uploadPhoto(photo, endpoint);
}

/** A kamera elérhetősége – szimulátoron nincs, ott csak a galéria marad. */
export const CAMERA_AVAILABLE = Platform.OS !== "web";
