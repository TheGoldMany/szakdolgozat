# 22 – Közösség, tartalom és platformadatok

## Összefoglalás

Ez a dokumentum azokat a funkciókat fedi le, amelyek eddig kimaradtak a
teszteset-dokumentációból: a **Napi állatok** képfolyamot, az **ismerősöket**,
a **cikkeket** (keresőoptimalizálással), az **állatorvosi rendelők**
nyilvántartását és az **audit naplót**. Mindegyik élesben működik, csak írásban
nem volt rögzítve, mit várunk tőlük.

---

## 22.1 Napi állatok

Instagram- és BeReal-szerű képfolyam: napi képek állatokról. A jobb alsó sarokban
lévő lebegő gombról (`DailyLauncher`) nyílik, a saját képek feltöltése és a
naptáras visszanézés a `/hu/profile/napi` oldalon van.

Ami a felületből nem derül ki:

- **A képfolyam 24 órás.** A `DAILY_FEED_HOURS = 24` a *lekérdezés* ablaka, nem
  törlés: a régebbi képek megmaradnak az adatbázisban, mert a **naptár** azokat
  olvassa vissza. Aki tegnapi képet keres, a naptárban találja meg.
- **Alapból csak az ismerősöket látod.** A körön kívüli (ajánlott, felkapott)
  képek megjelenítése külön beleegyezéshez kötött
  (`User.dailyFeedExpanded`, alapértéke hamis). Aki nem kérte, csak azt látja,
  akit ismer.
- **Első megnyitáskor funkciómagyarázó fut** (`User.dailyIntroSeen`).
- **A naptár napokra bontása a szerveren történik**, a megjelenítési időzóna
  szerint — nem a böngésző számol, mert az eltérő időzónában más napra sorolná
  ugyanazt a képet.
- **Helyadatot nem használ.** A képfolyam nem térképes.

### TC-22-01: Napi kép feltöltése és a 24 órás ablak

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` bejelentkezve |
| **URL** | `/hu/profile/napi` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A felhasználó fel tud tölteni egy képet, opcionális képaláírással
- [ ] A kép azonnal megjelenik a saját képfolyamában
- [ ] A képhez menhelyi állat is hozzáköthető (opcionális)
- [ ] 24 óránál régebbi kép **nem** jelenik meg a képfolyamban
- [ ] Ugyanaz a kép a **naptárban** viszont visszanézhető
- [ ] A naptár a képet a helyes naphoz sorolja

**Tesztelési lépések:**
1. Navigálj a `/hu/profile/napi` oldalra, és tölts fel egy képet.
2. Nyisd meg a képfolyamot a jobb alsó sarki gombbal — ott kell lennie.
3. Az adatbázisban állítsd egy korábbi kép `createdAt` mezőjét 25 órával korábbra.
4. Töltsd újra a képfolyamot.
5. Nyisd meg a naptárat, és keresd meg a régebbi képet.

**Elvárt eredmény:**
A 25 órás kép eltűnik a folyamból, de a naptárban megmarad a helyes napon.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-22-02: A körön kívüli tartalom beleegyezéshez kötött

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Olyan fiók, amelynek **nincs** ismerőse, és a `dailyFeedExpanded` hamis |
| **URL** | Bármely oldal (lebegő gomb) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Első megnyitáskor megjelenik a funkciómagyarázó
- [ ] Ismerős nélkül a képfolyam üres, **nem** mutat idegen képeket
- [ ] Megjelenik egy kérdés, hogy szeretne-e ajánlott/felkapott képeket is látni
- [ ] Elfogadás után a `User.dailyFeedExpanded` `true` lesz, és a folyam feltöltődik
- [ ] A beleegyezés visszavonható
- [ ] A funkciómagyarázó másodszor már nem jelenik meg (`dailyIntroSeen`)

**Tesztelési lépések:**
1. Állítsd a teszt-fiók `dailyIntroSeen` és `dailyFeedExpanded` mezőit hamisra.
2. Jelentkezz be, és nyisd meg a képfolyamot a lebegő gombbal.
3. Olvasd végig a magyarázót, majd nézd meg az üres folyamot.
4. Fogadd el a kibővített megjelenítést, és ellenőrizd az adatbázisban a mezőt.
5. Zárd be és nyisd meg újra a folyamot.

**Elvárt eredmény:**
Beleegyezés nélkül nincs idegen tartalom; a magyarázó csak egyszer fut.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## 22.2 Ismerősök

Kölcsönös kapcsolat két felhasználó között. A Napi állatok képfolyam alapból az
ismerősök képeit mutatja, tehát az ismerősség nem öncélú: ez szabja meg, ki mit
lát.

Ami a felületből nem derül ki:

- **A kölcsönös jelölés maga az elfogadás.** Ha A bejelöli B-t, és B is bejelöli
  A-t, nem keletkezik két várakozó kérés: a második jelölés **elfogadás**.
- **Egy sor tartozik egy párhoz.** A tábla egyedi kulcsa a két azonosító
  rendezve (`pairKey`), nem a `(kérő, megszólított)` pár — az utóbbi csak az
  „A → B kétszer" esetet zárná ki, az „A → B és közben B → A"-t nem.
- **Elfogadni csak a megszólított tud**, és két egyidejű hívásból csak egy nyer:
  a feltétel az írás `where`-jében van, nem előzetes ellenőrzésben.
- **Mindkét fél kiléphet** a kapcsolatból, és a saját, még el nem fogadott
  jelölés visszavonható.

### TC-22-03: Kölcsönös jelölés = elfogadás

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Két teszt-fiók, amelyek még nem ismerősök |
| **URL** | `/hu/profile/ismerosok` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] „A" bejelöli „B"-t → a jelölés az „Elküldött jelölések" között jelenik meg
- [ ] „B"-nél ugyanez a „Válaszra vár" listába kerül, és értesítést kap róla
- [ ] Ha „B" **nem** az Elfogadom gombot nyomja, hanem maga is bejelöli „A"-t, azonnal ismerősök lesznek
- [ ] Ilyenkor nem marad ott egy fölösleges, várakozó jelölés
- [ ] Mindketten értesítést kapnak az elfogadásról
- [ ] A kapcsolat bármelyik fél által megszüntethető

**Tesztelési lépések:**
1. Két böngészőben jelentkezz be a két fiókkal.
2. „A" fiókkal keresd meg és jelöld be „B"-t.
3. „B" fiókkal **ne** fogadd el, hanem keresd meg „A"-t, és jelöld be te is.
4. Ellenőrizd mindkét fiók ismerőslistáját és az értesítéseket.
5. Szüntesd meg a kapcsolatot „B" fiókkal.

**Elvárt eredmény:**
A második jelölés elfogadásként működik; nem keletkezik duplikált vagy árván maradt sor.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## 22.3 Cikkek

Nyilvános tartalom a `/hu/articles` oldalon, címke szerinti szűréssel
(`/hu/articles/cimke/[tag]`). A szerkesztés a `/dashboard/posts` oldalon van.

Ami a felületből nem derül ki:

- **A `publishedAt` dönti el a publikáltságot.** Üresen a cikk piszkozat, és
  csak a szerkesztőben látszik.
- **A keresőoptimalizálás külön mezőkön megy.** A `seoTitle` és a
  `metaDescription` szándékosan nem azonos a címmel és a bevezetővel: a jó
  olvasói cím és a jó keresőcím ritkán ugyanaz. Üresen hagyva a `title`,
  illetve az `excerpt` a tartalék.
- **A `focusKeyword` visszajelzést ad** a szerkesztőben: szerepel-e a kulcsszó a
  címben, a leírásban és a szövegben.
- **A cikk menhelyhez köthető, de nem kötelező** (`shelterId` nullázható), és a
  szerző törlése nem törli a cikket (`authorId` ilyenkor null).

### TC-22-04: Cikk publikálása és keresőoptimalizálása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve |
| **URL** | `/dashboard/posts`, `/hu/articles` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Új cikk mentés után piszkozat marad, és **nem** jelenik meg a `/hu/articles` listában
- [ ] Publikálás után megjelenik a listában
- [ ] A cikkoldal címe a `seoTitle` értéke, ha van; egyébként a `title`
- [ ] A meta leírás a `metaDescription`, ha van; egyébként az `excerpt`
- [ ] A `focusKeyword` megadásakor a szerkesztő visszajelzést ad a kulcsszó előfordulásairól
- [ ] A címkére kattintva a `/hu/articles/cimke/[tag]` oldal csak az adott címkéjű cikkeket mutatja

**Tesztelési lépések:**
1. Hozz létre egy cikket a `/dashboard/posts` oldalon, publikálás nélkül.
2. Nyisd meg a `/hu/articles` oldalt — nem lehet ott.
3. Publikáld a cikket, és töltsd újra a listát.
4. Tölts ki eltérő `seoTitle` és `metaDescription` értéket, és nézd meg az oldal forrását.
5. Kattints egy címkére.

**Elvárt eredmény:**
A piszkozat rejtve marad, a publikált cikk megjelenik, és a keresőmezők felülírják az alapértelmezést.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## 22.4 Állatorvosi rendelők

Platform-szintű adat, **super admin** kezeli a `/dashboard/vets` oldalon. A
nyilvános térképen külön rétegként jelenik meg, ügyeletes jelöléssel.

Ami a felületből nem derül ki:

- **Nem menhelyhez tartozik**, hanem a platformhoz — ezért nem a menhely adminja
  szerkeszti.
- **Tömeges importálás van** (`POST /api/admin/vets/import`), egyszerre
  legfeljebb **500 sor**. A fejlécet **magyarul és angolul is** elfogadja
  (`név`/`name`, `cím`/`address`, `nyitvatartás`/`openingHours`, `ügyelet`/
  `isEmergency`, …).
- **Az ügyelet jelölése rugalmas**: `igen`, `yes`, `true`, `1`, `x` is elfogadott.
- **Koordináta nélküli rendelő nem kerül a térképre** — a `/api/map` kizárja a
  `lat`/`lng` nélküli sorokat.

### TC-22-05: Rendelők importálása és megjelenése a térképen

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `admin@test.hu` (SUPER_ADMIN) bejelentkezve |
| **URL** | `/dashboard/vets`, `/hu/map` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/vets` oldal csak SUPER_ADMIN-nak érhető el (más szerepkör 403)
- [ ] Kézzel felvett rendelő megjelenik a listában
- [ ] Az importálás magyar fejlécű táblázatot is elfogad
- [ ] 500-nál több sor esetén hibaüzenetet ad
- [ ] Az „ügyelet" oszlopban az `igen` érték ügyeletes rendelőt hoz létre
- [ ] Koordinátával rendelkező rendelő megjelenik a `/hu/map` térképen, saját rétegként
- [ ] Koordináta nélküli rendelő **nem** jelenik meg a térképen, de a listában igen

**Tesztelési lépések:**
1. Jelentkezz be super adminként, és nyisd meg a `/dashboard/vets` oldalt.
2. Végy fel egy rendelőt kézzel, koordinátákkal.
3. Importálj egy magyar fejlécű táblázatot (`név;cím;város;ügyelet`), benne egy `igen` értékkel.
4. Végy fel egy rendelőt koordináták nélkül.
5. Nyisd meg a `/hu/map` oldalt, és kapcsold be az állatorvos réteget.
6. Jelentkezz be menhelyi adminként, és próbáld megnyitni a `/dashboard/vets` oldalt.

**Elvárt eredmény:**
Az import lefut, az ügyelet jelölés érvényesül, a koordináta nélküli rendelő nincs a térképen, és más szerepkör nem fér hozzá.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## 22.5 Audit napló

A super admin visszafordíthatatlan vagy más felhasználót érintő műveleteit
rögzíti (`AuditLog`), a `/dashboard/audit` oldalon nézhető vissza.

Rögzített műveletek (`AuditAction`):

| Csoport | Értékek |
|---|---|
| Felhasználó | `USER_SUSPENDED`, `USER_REACTIVATED`, `USER_DELETED`, `USER_ROLE_CHANGED` |
| Menhely | `SHELTER_VERIFIED`, `SHELTER_UNVERIFIED` |
| Kampány | `CAMPAIGN_APPROVED`, `CAMPAIGN_REJECTED`, `CAMPAIGN_EDITED`, `CAMPAIGN_DELETED` |
| Pénzügy | `TIER_DELETED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_DELETED` |
| Űrlap | `FORM_APPROVED`, `FORM_REJECTED` |

Ami a felületből nem derül ki:

- **A bejegyzés túléli a végrehajtót.** Az `actorId` a felhasználó törlésekor
  `null`-ra vált (`onDelete: SetNull`), maga a napló megmarad — különben épp a
  legérdekesebb esetben tűnne el a nyom.
- **A cél nevét is eltároljuk** (`targetName`), nem csak az azonosítót: a törölt
  elem neve később már sehonnan nem volna kiolvasható.
- **Az indoklás (`reason`) opcionális**, de felfüggesztésnél és elutasításnál
  érdemes kitölteni — ez kerül a felhasználónak küldött értesítésbe is.

### TC-22-06: Audit bejegyzés keletkezik és megmarad

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `admin@test.hu` (SUPER_ADMIN), és egy törölhető teszt-felhasználó |
| **URL** | `/dashboard/users`, `/dashboard/audit` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Felhasználó felfüggesztésekor `USER_SUSPENDED` bejegyzés keletkezik
- [ ] A bejegyzés tartalmazza a végrehajtót, a célpont nevét és az indoklást
- [ ] Szerepkör-váltáskor `USER_ROLE_CHANGED` keletkezik
- [ ] A `/dashboard/audit` oldal időrendben, legfrissebb elöl mutatja a bejegyzéseket
- [ ] A végrehajtó admin törlése után a bejegyzés **megmarad**, csak a végrehajtó neve tűnik el
- [ ] Az oldal csak SUPER_ADMIN-nak érhető el

**Tesztelési lépések:**
1. Super adminként függessz fel egy teszt-felhasználót, indoklással.
2. Nyisd meg a `/dashboard/audit` oldalt, és keresd meg a bejegyzést.
3. Változtasd meg egy másik felhasználó szerepkörét.
4. Ellenőrizd az új bejegyzést.
5. (Adatbázisban) töröld a végrehajtó felhasználót, és nézd meg a naplót újra.

**Elvárt eredmény:**
Minden művelet nyomot hagy, a napló a végrehajtó törlése után is olvasható marad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
