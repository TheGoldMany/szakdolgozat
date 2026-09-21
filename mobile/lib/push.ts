import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { deletePushToken, registerPushToken } from "./api";

/**
 * Push értesítések a mobil oldalon.
 *
 * MIT CSINÁL ÉS MIT NEM: a push csak figyelemfelhívás. Az értesítés hiteles
 * forrása a szerveren létrehozott sor, amit az Értesítések képernyő mutat —
 * ezért ha a regisztráció bármiért elhasal (nincs engedély, nincs hálózat,
 * nincs EAS projekt), az app teljes értékűen működik tovább. Ebben a fájlban
 * EGYETLEN hiba sem terjedhet a hívó felé.
 *
 * iOS: A KÓD KÉSZ, DE ALAPBÓL KI VAN KAPCSOLVA. Az Apple push szolgáltatásához
 * APNs-kulcs kell, ami fejlesztői tagsághoz kötött, és az még nincs meg.
 * Kulcs nélkül a `getExpoPushTokenAsync` hibát dob — ezért iOS-en addig
 * CSENDBEN nem regisztrálunk: nem kérünk engedélyt (amit a felhasználó egyszer
 * elutasítva nehezen ad meg újra), és nem mutatunk hibát. Amikor a tagság
 * meglesz, az `EXPO_PUBLIC_PUSH_IOS_ENABLED=true` bekapcsolja.
 *
 * Az Expo Go SDK 53 óta NEM támogatja a távoli push értesítést — fejlesztéshez
 * development build kell. Ez sem hiba, csak ott a regisztráció nem jár sikerrel.
 */

/**
 * iOS kapcsoló. Az `EXPO_PUBLIC_` előtagú változókat az Expo build időben
 * behelyettesíti, tehát ez egy build-időbeli döntés, nem futásidejű.
 */
const IOS_ENABLED = process.env.EXPO_PUBLIC_PUSH_IOS_ENABLED === "true";

/** A legutóbb regisztrált token – kijelentkezéskor ezt kell leregisztrálni. */
const TOKEN_KEY = "push_token";

/**
 * Előtérben érkező értesítés megjelenítése.
 *
 * Alapból az Expo NEM mutatja meg a nyitott appban érkező értesítést. Nálunk
 * viszont van értelme: az üzenetlistán ülve is látni kell, ha új üzenet jött —
 * a `shouldShowBanner` adja a lehúzható sávot, a `shouldShowList` pedig az
 * értesítési központba is beteszi, hogy később is visszakereshető legyen.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

/**
 * Android értesítési csatorna.
 *
 * Az Android 8 óta minden értesítés csatornához tartozik, és a csatorna
 * dönti el a hangot meg a fontosságot — a küldéskor megadott `priority` önmagában
 * nem elég. Ha nem hozzuk létre, a rendszer a néma alapértelmezettet használja.
 * A szerver `channelId: "default"` néven küld, ezért ez a név kötött.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name:             "Értesítések",
    importance:       Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Az EAS projektazonosító.
 *
 * A `getExpoPushTokenAsync` enélkül nem tud tokent kérni. Az azonosító akkor
 * kerül az `app.json`-ba, amikor a projekt EAS-hez van kötve (`eas init`) —
 * ez még nem történt meg, ezért a hiányát külön kezeljük, nem hibaként.
 */
function projectId(): string | null {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas    = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return (typeof fromConfig === "string" && fromConfig) || fromEas || null;
}

/**
 * Regisztráció push értesítésre, bejelentkezés után.
 *
 * `null`-t ad vissza minden olyan esetben, amikor nem sikerült — és ez NEM
 * hiba: nincs engedély, nincs EAS projekt, iOS-en ki van kapcsolva, Expo Go-ban
 * fut, vagy szimulátoron. A hívónak nincs teendője.
 */
export async function registerForPush(): Promise<string | null> {
  try {
    // iOS: amíg nincs APNs-kulcs, meg sem próbáljuk – lásd a fájl elején.
    if (Platform.OS === "ios" && !IOS_ENABLED) return null;

    await ensureAndroidChannel();

    // Engedély. Ha egyszer már elutasította, nem kérdezünk rá újra
    // automatikusan: az ismételt rendszerablak zavaró, és Androidon amúgy is
    // csak a beállításokban lehetne visszavonni.
    const current = await Notifications.getPermissionsAsync();
    const status = current.granted
      ? current.status
      : current.canAskAgain
        ? (await Notifications.requestPermissionsAsync()).status
        : current.status;
    if (status !== "granted") return null;

    const id = projectId();
    if (!id) {
      console.warn("[push] nincs EAS projektazonosító – a push regisztráció kimarad");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });

    await registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return token;
  } catch (err) {
    // Szimulátor, Expo Go, hiányzó hitelesítő adatok, offline – mind ide fut be.
    console.warn("[push] regisztráció kimaradt:", err);
    return null;
  }
}

/**
 * Leregisztrálás kijelentkezéskor.
 *
 * FONTOS, hogy a munkamenet törlése ELŐTT fusson: a szerver hitelesítést vár,
 * és utána már nem volna mivel hitelesíteni. Ha kimaradna, a következő
 * belépő felhasználó megkapná az előző értesítéseit ezen a telefonon.
 */
export async function unregisterFromPush(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await deletePushToken(token);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    // A token a szerveren maradhat: a küldéskor kapott „DeviceNotRegistered"
    // hibára amúgy is törlődik. Ettől a kijelentkezés nem hiúsulhat meg.
    console.warn("[push] leregisztrálás nem sikerült:", err);
  }
}

/** A jelvény nullázása – az olvasatlanok száma a szerveren úgyis frissül. */
export async function clearBadge(): Promise<void> {
  try { await Notifications.setBadgeCountAsync(0); } catch { /* nem kritikus */ }
}
