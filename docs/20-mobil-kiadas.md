# Mobilalkalmazás kiadása — adatkezelés és teendők

Ez a dokumentum két dolgot ad: a store-kérdőívek kitöltéséhez szükséges
**adatlistát**, és a kiadás **még hiányzó lépéseit**.

> **Amit nem ellenőriztem:** az App Store és a Google Play szabályzatának
> aktuális szövegét, az árakat és az átfutási időket. Ezek változnak, és pénz
> múlik rajtuk — nézd meg a forrásnál is. Az alábbi adatlista viszont a
> **kódból** származik, nem általános ismeretből.

---

## 1. Mit gyűjt az app — a kérdőívekhez

Ezt kell beírni az **App Store Connect → App Privacy** és a
**Google Play Console → Data safety** kérdőívbe. A lista a `mobile/` kódjából
származik: minden sor mellett ott van, honnan.

### Gyűjtött adatok

| Adat | Hol | Mire | Kötött-e a személyhez |
|---|---|---|---|
| **E-mail cím** | bejelentkezés, regisztráció | fiókazonosítás | igen |
| **Jelszó** | bejelentkezés, regisztráció | hitelesítés | igen |
| **Név** | regisztráció, profil | megjelenítés, menhelyi kommunikáció | igen |
| **Telefonszám** | profil (opcionális) | menhelyi kapcsolatfelvétel | igen |
| **Lakcím, város** | profil (opcionális) | örökbefogadási kérelem elbírálása | igen |
| **Háztartási adatok** | örökbefogadási kérelem | a menhely dönteni tudjon | igen |
| **Üzenetek** | menhellyel folytatott beszélgetés | kommunikáció | igen |
| **Kedvencek, kérelmek, időpontok** | app használat | a funkció működése | igen |
| **Fotók (kamera vagy galéria)** | bejelentés, napi kép | az állat azonosítása, illetve a napi képfolyam | igen |
| **Push token (eszközazonosító)** | értesítések | a telefon értesítést kapjon új üzenetről, kérelemről | igen |

### Ami külön figyelmet érdemel

**A háztartási adatok között szerepel, hogy van-e gyermek a háztartásban**
(`hasChildren` az örökbefogadási kérelemben). Mindkét store külön kérdez a
gyermekekre vonatkozó adatokról. Ez nem a gyermek adata, hanem a felnőtt
válasza egy kérdésre, de a kérdőívben érdemes pontosan megjelölni — ha
bizonytalan, inkább a szigorúbb választ add meg.

### Amit NEM gyűjt

Ezeket nyugodtan „nem" válasszal jelölheted:

- **Nincs analitika, nincs összeomlás-jelentő, nincs reklám-SDK.** A `mobile/`
  15 függősége között egy sem ilyen — ellenőrizve.
- **Nincs helyadat.** Nincs `expo-location`, az app nem kér helyet. A
  bejelentésnél a felhasználó *beírja* a várost, nem a készülék méri. A térkép
  sem kér: az `expo-maps` plugin `requestLocationPermission: false`
  beállítással van felvéve, tehát nem ad hozzá helyengedélyt, és a kezdő nézet
  fix (Magyarország), nem a felhasználó helyzete.
- **Nincs mikrofon- és videóhozzáférés.** Csak állóképet készítünk. Az
  `expo-image-picker` alapértelmezésben `RECORD_AUDIO`-t kérne Androidon;
  ezt a plugin `microphonePermission: false` beállítása kifejezetten
  **letiltja**. Nem használt engedélyt kérni fölösleges kockázat.
- **Nincs harmadik félnek átadott adat.** Az app kizárólag a saját backendünkkel
  beszél. A képek a saját Vercel Blob tárolónkba kerülnek, a `/api/upload`
  végponton keresztül. **Egy kivétel van: a push értesítés** — lásd alább, ezt
  a kérdőívben jelölni kell.
- **Nincs nyomon követés (tracking).** Nincs reklámazonosító-használat, tehát az
  App Tracking Transparency sem kell.

### Kamera és fotótár — iOS usage description mostantól KÖTELEZŐ

Ez a szakasz korábban azt írta, hogy az app nem kér kamerát és fotótárat,
tehát usage description sem kell. **Ez már nem igaz**, és a kérdőívben is
másképp kell válaszolni.

Az app két helyen fotóz, és ez a fő mobil-előnye:

- **Bejelentés** (elveszett / talált / kóbor állat): a bejelentő a helyszínen
  áll az állattal szemben. Weben ehhez a képet másik eszközre kellene átvinni
  és utólag feltölteni — mire ez megtörténik, az állat gyakran már nincs ott.
- **Napi kép**: a menhelyi admin az állatok között van, telefonnal a kezében.

A hozzájuk tartozó engedélyek az `app.json`-ban, az `expo-image-picker`
plugin konfigurációjában vannak:

| Engedély | Platform | Hogyan |
|---|---|---|
| `NSCameraUsageDescription` | iOS | a plugin `cameraPermission` értéke |
| `NSPhotoLibraryUsageDescription` | iOS | a plugin `photosPermission` értéke |
| `android.permission.CAMERA` | Android | **kézzel**, az `android.permissions` tömbben |
| `android.permission.RECORD_AUDIO` | Android | **letiltva** (`microphonePermission: false`) |

**A szövegek magyarul vannak**, mert a felhasználó pontosan ezt a mondatot
olvassa az engedélykérő ablakban, és eldönti belőle, hogy megnyomja-e az
„Engedélyezés" gombot. Az Apple ezen felül el is utasítja a semmitmondó
indoklást — a „this app needs camera access" típusú szöveg elbukik a
felülvizsgálaton.

Két részlet, amiért utánanéztem a v56-os dokumentációnak, és nem a
kézenfekvő beállítást használtam:

1. **A plugin NEM adja hozzá az Android `CAMERA` engedélyt.** Csak az iOS
   usage descriptiont állítja be. Ezért szerepel külön az
   `android.permissions` alatt.
2. **A plugin viszont hozzáadja a `RECORD_AUDIO`-t**, amire nincs szükségünk.
   Ezt a `microphonePermission: false` blokkolja.

### Ha a felhasználó nem ad engedélyt

Az app nem akad el. A fotózás és a galéria **két külön gomb**, nem egy közös
választó mögött — ha a kamerahozzáférést megtagadják, a galéria gomb ugyanúgy
ott van és működik. Végleges elutasításnál (`canAskAgain === false`) a
rendszerbeállításokra mutatunk, mert onnan már csak ott lehet visszavonni.

### Push értesítés — új engedély és új adattovábbítás

**Ez a lista a push bevezetésével bővült.** Két dolgot érint a kérdőívekben:

| Engedély | Platform | Hogyan |
|---|---|---|
| Értesítési engedély | iOS | a rendszer kéri, az `expo-notifications` hívja |
| `android.permission.POST_NOTIFICATIONS` | Android | az `expo-notifications` plugin adja hozzá (Android 13+) |

**Adattovábbítás az Expo felé.** A push az **Expo push szolgáltatásán**
keresztül megy, tehát ez az egyetlen pont, ahol adat hagyja el a saját
rendszerünket. Ami átmegy: az eszköz push tokenje, valamint az értesítés
**címe és szövege** — ez utóbbi tartalmazhat nevet (pl. „Új üzenet Kiss
Páltól"). Üzenet tartalmát nem küldünk. A kérdőívben ezt „harmadik félnek
átadott adat"-ként kell jelölni.

**Amit a felhasználó szabályozni tud.** Három kapcsoló az appban (Profil →
Értesítési beállítások): *Üzenetek és válaszok*, *Ügyintézés*, *Közösség*.
Nem 51 kapcsoló típusonként — a leképezés a szerveren, a `lib/push.ts`-ben van.
Kikapcsolt kategóriánál az értesítés **létrejön** (az Értesítések listában
megtalálja), csak nem szól.

**iOS-en jelenleg ki van kapcsolva.** Az Apple push szolgáltatásához APNs-kulcs
kell, ami a fejlesztői tagsághoz kötött, és az még nincs meg. Az app iOS-en
addig **csendben nem regisztrál** push tokent, és engedélyt sem kér — nem hibát
mutat. Bekapcsolás: `EXPO_PUBLIC_PUSH_IOS_ENABLED=true` a build környezetében.

**Az Expo Go nem jó a teszteléshez.** SDK 53 óta nem támogatja a távoli push
értesítést; development vagy `preview` build kell hozzá.

**Androidhoz FCM-kulcs kell az Expo oldalán.** A Firebase-projekt szolgáltatás-
fiókkulcsát (FCM V1) fel kell tölteni az `eas credentials` alatt, különben az
Expo nem tudja kézbesíteni az üzenetet. Ez még nincs meg.

### Tárolás az eszközön

A munkamenet-token és a felhasználó alapadatai **`expo-secure-store`**-ban
vannak (iOS Keychain / Android Keystore), nem sima fájlban. Kijelentkezéskor és
fióktörléskor törlődnek.

---

## 2. Fiók törlése — kész

Az Apple minden olyan appnál megköveteli, ahol fiókot lehet létrehozni.
**Megvan**, a profil képernyő alján, két megerősítő lépéssel.

Egy dolgot érdemes tudni: a webes végpont korábban `getServerSession`-t
használt, tehát **csak böngésző-munkamenetet fogadott el** — a mobil `Bearer`
tokennel mindig 401-et kapott volna. Ez javítva van (`requireAuthUser`), és
mérve: mobil tokennel `{"success":true}`, a felhasználó neve, e-mailje,
telefonja és városa anonimizálva.

A felfüggesztett fiók is törölhető (`allowSuspended: true`) — attól nem szabad
elvenni a saját fiókja törlésének jogát, aki épp a leginkább akarja.

---

## 3. EAS Build — parancsok sorrendben

A `mobile/eas.json` elkészült, három profillal. **Mac nem kell**: az iOS build
az EAS felhőjében fut.

```bash
# egyszer, globálisan
npm install -g eas-cli

cd mobile
eas login                    # Expo-fiók (ingyenes)
eas init                     # projekt összekötése – ez írja be a projectId-t

# 1) Fejlesztői build (Expo Dev Client, telepíthető a saját eszközre)
eas build --profile development --platform android
eas build --profile development --platform ios

# 2) Belső teszt – Androidon .apk, megosztható linkkel
eas build --profile preview --platform android

# 3) Store-ba szánt build
eas build --profile production --platform android
eas build --profile production --platform ios     # itt kér Apple-belépést

# 4) Feltöltés
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

**A build-számot az EAS tartja nyilván**, nem az `app.json`. Ezért van
`"appVersionSource": "remote"` és `"autoIncrement": true` — így minden
feltöltésnél magasabb számot kap, kézi léptetés nélkül. Emiatt **ne írj
`ios.buildNumber`-t vagy `android.versionCode`-ot az `app.json`-ba**: a kettő
egymás ellen dolgozna.

A `version` (`1.0.0`) marad az `app.json`-ban — azt a felhasználó látja, és
azt te döntöd el.

### Első Apple/Google belépés

- **iOS**: az `eas build --platform ios` végigvezet a tanúsítványokon. Hagyd,
  hogy az EAS kezelje őket (`Let EAS handle it`) — ez spórolja a legtöbb szívást.
- **Android**: az EAS legenerálja az aláíró kulcsot. **Ezt mentsd el**
  (`eas credentials`), mert ha elveszik, ugyanazt az appot nem tudod frissíteni.

---

## 4. Ami még hiányzik

| Teendő | Állapot |
|---|---|
| `eas.json` | ✅ kész |
| Splash konfiguráció | ✅ kész (`expo-splash-screen` plugin) |
| Build-szám léptetés | ✅ kész (EAS oldalon) |
| Fiók törlése az appból | ✅ kész |
| Adatvédelmi tájékoztató elérése az appból | ✅ kész (profil képernyő) |
| Adatkezelési kérdőívek | ⬜ a fenti lista alapján neked kell kitölteni — **a fotók és a push token már benne vannak** |
| iOS usage description szövegek | ✅ kész (magyarul, `app.json`) |
| Android kamera-engedély | ✅ kész |
| Push értesítés (kód, beállítások, leiratkozás) | ✅ kész |
| **APNs-kulcs** (iOS push) | ⬜ Apple-tagsághoz kötött; addig iOS-en ki van kapcsolva |
| **FCM V1 szolgáltatásfiók-kulcs** (Android push) | ⬜ `eas credentials` alatt feltölteni |
| **Google Maps API-kulcs** (Android térkép) | ⬜ `eas secret:create --name GOOGLE_MAPS_API_KEY`; enélkül a térkép szürke |
| `EXPO_ACCESS_TOKEN` a Vercelen | ⬜ enélkül is megy a küldés, de vele nem tud más a nevünkben küldeni |
| **Apple Developer Program** (99 USD/év) | ⬜ napok–hetek átfutás |
| **Google Play Console** (25 USD egyszeri) | ⬜ + zárt teszt, lásd lent |
| Store assetek (képernyőképek, leírás, kategória) | ⬜ |
| Korhatár-besorolás kérdőív | ⬜ |

### Google zárt teszt

Új fejlesztői fiókoknál a Google elvárhat egy zárt tesztet a publikus kiadás
előtt (tesztelőkkel, hetekben mérhető ideig). **Ezt érdemes legelőször
elindítani**, mert ez a leglassabb lépés — a követelmény pontos szövegét és
számait a Play Console-ban nézd meg, mert változott már.

Ha a szakdolgozat leadásáig az app **nem muszáj, hogy publikus** legyen, van
gyorsabb út: a `preview` profillal készült `.apk` megosztható linkkel, iOS-re
pedig TestFlight belső teszt. Mindkettő bemutatható, és nem függ a store-os
átfutástól.

---

## 5. Nyitott kérdés, amit el kell dönteni

### A `www` / nem-`www` eltérés

A `mobile/lib/api.ts` tartalék értéke `https://www.allatimenhelyek.hu`. Hogy ez,
a webes `NEXT_PUBLIC_APP_URL` és a Stripe webhook-végpont **ugyanarra a
gazdagépre mutat-e**, még nincs eldöntve. Ez a fizetési átnézésben is előjött.

Amikor kiderül, melyik a helyes, **három helyen kell egyszerre javítani**:
`mobile/lib/api.ts`, a Vercel környezeti változói, és a Stripe
webhook-végpont URL-je.

### Fizetés az appban

A mobilos adományozás store-szabályozási kérdése **nyitott**. Az Apple App Store
Review Guidelines 3.2.1 pontja szabályozza a külső fizetést; a jótékonysági
adományra van kivétel, de az jellemzően igazolt nonprofit szervezetekhez kötött.
A platform 5% díjat von le, ami nem biztos, hogy belefér.

**Ezt a mobilos fizetési kód megírása előtt kell tisztázni**, mert eldönti, hogy
egyáltalán érdemes-e beépíteni. Ha nem fér bele, két irány marad: az adományozás
kimarad az appból (és akkor **linkelni sem szabad rá**), vagy IAP-n megy
15–30% jutalékkal — ami az 5%-os platformdíjat felemészti.

A szabályzat aktuális szövegét nézd meg a forrásnál; ezt nem ellenőriztem.
