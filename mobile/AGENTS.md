# Mobilalkalmazás — íratlan szabályok

Expo SDK 56 + expo-router. Ez a fájl azt írja le, ami a kódból nem derül ki, és
ami már egyszer elvitt órákat. A `CLAUDE.md` erre hivatkozik.

## Mielőtt Expo-kódot írsz

**Olvasd el a pontos, verziózott dokumentációt:**
<https://docs.expo.dev/versions/v56.0.0/>

Az Expo API-ja SDK-k között változik, és a betanított tudás gyakran egy régebbi
verzióra épül. Ha van Context7 vagy hasonló dokumentáció-eszköz, azzal kérdezz rá
a konkrét csomagra, ne a memóriádból dolgozz.

## A telepítés csapdája

**A `react` verziójának egyeznie kell azzal, amit a `react-dom` kér.**

A projekt korábban `react: 19.2.7`-re volt fixálva, miközben a tranzitívan
behúzott `react-dom@19.2.8` `react@19.2.8`-at kért. Emiatt a **sima `npm install`
ERESOLVE hibával elhasalt** — tehát sem lokális, sem EAS build nem volt lehetséges.
A `react-dom` a webes támogatás és a `@expo/dom-webview` miatt kerül be, akkor is,
ha az app csak natívra készül.

Ha újra ilyet látsz: a hibanapló (`/root/.npm/_logs/*eresolve-report.txt`) első
sora megmondja, MI ütközik. A `react-native-worklets`-re vonatkozó sorok csak
figyelmeztetések, nem azok blokkolják a telepítést — ne azokat kezdd javítani.

**Ne oldd meg `--legacy-peer-deps`-szel.** Az elrejti a gondot, és az EAS build
ugyanott elhasal, mert az is sima `npm install`-t futtat.

Ha van hálózati elérésed, a hivatalos út a verziók összehangolására:

```bash
npx expo install --check    # megmondja, mi nem stimmel
npx expo install --fix      # és összehangolja az SDK-hoz
```

## A backend címe

A `lib/api.ts`-ben:

```ts
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://www.allatimenhelyek.hu";
```

Az Expo SDK 56 az `EXPO_PUBLIC_` előtagú változókat **build időben behelyettesíti**,
tehát bekerülnek a csomagba — **titkot ide soha ne írj**. Lokális fejlesztéshez
másold a `.env.example`-t `.env`-be.

Szimulátorban a `localhost` a szimulátor saját gépét jelenti, nem a tiedet — a
fejlesztőgép IP-címe kell (pl. `http://192.168.0.10:3000`).

**Nyitott ügy:** a `www` / nem-`www` kérdés. A tartalék érték a `www`-s változat,
mert eddig is az volt. Hogy a webes `NEXT_PUBLIC_APP_URL`, a Stripe
webhook-végpont és ez a konstans ugyanarra a gazdagépre mutat-e, még nincs
eldöntve. **Ezt ne írd át találgatásból** — egy éles URL csendben átírása
rosszabb, mint a jelenlegi állapot. Amikor kiderül, melyik a helyes, itt és a
Vercel környezeti változóiban EGYSZERRE kell javítani.

## Hibakezelés

A `lib/api.ts` `ApiError`-t dob, `kind` mezővel: `offline`, `unauthorized`,
`notFound`, `client`, `server`. **Ne dobj nyers `Error`-t**, és ne nyeld el a
hibát `.catch(() => {})`-vel.

Ez azért van, mert korábban minden hiba `new Error("HTTP 500")`-ként jött, a
`fetch` dobása pedig ugyanúgy — a felület nem tudta megkülönböztetni a „nincs
net"-et a szerverhibától, és a felhasználó **üres képernyőt kapott magyarázat
nélkül**.

Az `ApiError.userMessage` kész magyar üzenetet ad; azt írd ki. A 401/403
automatikusan kijelentkeztet (az `AuthProvider` regisztrálja a kezelőt), hogy a
felhasználó ne maradjon félig bejelentkezett állapotban.

## Amitől a képernyők függenek

Az app a webes API-t hívja. **Ha új hívást írsz, előbb ellenőrizd, hogy a végpont
létezik-e** — ez nem elméleti kérdés: korábban három végpont hiányzott
(`GET /api/animals/{id}`, `GET /api/shelters`, `GET /api/shelters/{id}`), és az
állat-részletező meg a menhely-fül üres képernyőt mutatott.

A publikus végpontok alakját a webes `lib/public-shapes.ts` adja. Ott **kifejezett
`select` van, nem kizárás**: a `Shelter` sor bankszámlaszámot, adószámot és
Stripe-fiókazonosítót is tartalmaz, amit egy publikus végpont nem adhat ki. Ha új
mezőt kell kiadni, ott vedd fel — ne írd át `include`-ra.

Az állat három egészségügyi jelzője át van nevezve: az adatbázisban
`isVaccinated` / `isNeutered` / `isMicrochipped`, az app viszont `vaccinated` /
`neutered` / `chipped` néven kéri. A leképezés a `publicAnimal()`-ben van.

## Alapkészlet — ezeket ne írd meg újra

Képernyőt írni ezekből kell, nem nulláról:

**Adatlekérés** (`lib/use-api.ts`) — nincs benne külön könyvtár, mert a webes
oldal sem használ ilyet (nincs SWR, React Query): 86 kliens-komponens sima
`fetch` + `useState`/`useEffect` mintával dolgozik. Egy könyvtár behozása
kettéosztaná a projektet.

- `useApi(fetcher, deps)` → `{ data, error, loading, reload }`
- `usePagedList(fetchPage, deps)` → `{ items, error, loading, refreshing,
  loadingMore, hasMore, refresh, loadMore }`

Mindkettő eldobja az elavult válaszokat (gyors szűrőváltásnál a régi kérés
megelőzheti az újat), és lecsatolás után nem állít állapotot.

**Lista-lekérés** (`lib/api.ts`) — a webes végpontok a tömböt saját néven adják
(`animals`, `users`, …), a lapozást `pagination` alatt. A `getPage(path, key)`
ezt normalizálja `{ items, info }` alakra, a `getAllAsPage(path)` pedig a sima
tömböt adó végpontokat burkolja egyoldalas lappá — így a listakezelő kód
mindenhol ugyanaz. Kurzoros végponthoz `getCursorPage`.

Paramétert `withQuery`-vel fűzz, ne kézzel: az üres értékeket kihagyja.

**Komponensek** (`components/ui/`) — `Button`, `Field`, `DataList`, és a
`ScreenState`-ből `Loading` / `EmptyState` / `ErrorState` / `ListState`.
Színt és térközt a `theme.ts`-ből vegyél, ne írj hexakódot a képernyőbe.

A `DataList` az egész `usePagedList`-állapotot egy propban kapja meg,
szándékosan: így nem lehet a felét elfelejteni bekötni — és épp a hibaág az,
ami eddig kimaradt.

**A hibaág kötelező.** Az „üres lista" és a „nem sikerült betölteni" nem
ugyanaz. A `ListState` a hibát az üresség ELŐTT vizsgálja, mert fordítva egy
elhasalt lekérés „nincs találat"-ként jelenne meg, és a felhasználó a szűrőjét
kezdené igazgatni.

## Belépési pont

A `package.json` `main` értéke `expo-router/entry`, tehát a navigáció az `app/`
mappából épül. Az `App.tsx` és az `index.ts` a **blank Expo-sablon maradéka**
(„Open up App.tsx to start working on your app!") — halott kód, de ha valaki
hozzányúl a `main`-hez, az fog elindulni. Ne oda írj kódot.

## Engedélyek

Az app **nem** használ kamerát, fotótárat és helyadatot (nincs
`expo-image-picker`, `expo-location`, `expo-camera`). Ezért iOS usage
description stringre NINCS szükség. Ha ilyen funkciót írsz, akkor viszont
kötelező — és csak azokat vedd fel, amiket valóban használsz, mert az Apple a
fölösleges engedélykérést elutasítja.

## Ami a store-os kiadáshoz még hiányzik

Ezek tudott hiányok, nem felfedezésre várnak:

- **`eas.json`** — nincs. Enélkül nincs felhős build (Mac nélkül iOS-hez az EAS
  az egyetlen út).
- **Splash** — az `assets/splash-icon.png` megvan, de az `app.json`-ban nincs
  `splash` kulcs és nincs `expo-splash-screen` plugin. Az asset használaton kívül.
- **Build-szám** — sem `ios.buildNumber`, sem `android.versionCode`. A store
  minden feltöltésnél magasabb számot vár; az EAS tudja léptetni.
- **Fióktörlés az appból** — az Apple kötelezővé tette minden appnál, ahol fiókot
  lehet létrehozni. A backend megvan (`app/api/auth/delete-account/route.ts`), a
  mobilos felület nincs.
- **Adatvédelmi tájékoztató elérése az appból** — mindkét store kéri.

## Ellenőrzés

```bash
cd mobile
npm install          # sima, NEM --legacy-peer-deps; ha elhasal, lásd fentebb
npx tsc --noEmit
npx expo start       # Expo Go vagy dev client
```

A `npx expo install --check` hálózatot igényel; ha a környezet blokkolja az
Expo API-t, az nem a projekt hibája.
