# 12 – Super Admin funkciók

## Összefoglalás

Ez a modul fedi le a Super Admin kizárólagos funkcióit. A `SUPER_ADMIN` szerepkörű felhasználó (`admin@test.hu`) teljes körű hozzáféréssel rendelkezik a platformhoz: listázhatja és szerkesztheti az összes felhasználót és menhelyet, módosíthatja a felhasználók szerepkörét, felfüggesztheti, újraaktiválhatja és törölheti a felhasználói fiókokat, hitelesítheti a menhelyeket (verified badge), jóváhagyhatja vagy elutasíthatja a kampányokat. A felfüggesztett felhasználó bejelentkezhet és böngészhet, de minden módosító művelete HTTP 403-mal blokkolódik (`blockIfSuspended()` őr). A Super Admin dashboard ugyanazon `/dashboard` útvonalon érhető el, de kiegészítő szekciókkal rendelkezik, amelyek `SHELTER_ADMIN` számára nem láthatók.

**SUPER_ADMIN-exkluzív oldalak:**

| Oldal | URL | Leírás |
|---|---|---|
| Gyűjtések | `/dashboard/campaigns` | Összes kampány (minden státusz) szűrhető táblázatban; pending gyűjtések alatt jóváhagyás/elutasítás panel; alkalmazási kérdőívek jóváhagyása |
| Előfizetési csomagok | `/dashboard/tiers` | Az összes menhely összes `DonationTier`-jének read-only áttekintése (aktív előfizetők száma, összeg, menhely neve) |
| Előfizetések | `/dashboard/subscriptions` | Az összes menhely összes előfizetése szűrve (ACTIVE/CANCELLED), lemondás lehetőségével |
| Menhelyek | `/dashboard/shelters` | Összes menhely kezelése (hitelesítés, aktiválás, új menhely) |
| Felhasználók | `/dashboard/users` | Összes felhasználó, szerepkör-módosítás, fiók felfüggesztése / újraaktiválása / törlése (a saját és más SUPER_ADMIN sorok kivételével) |

---

## Felhasználói Történetek

- **US-12-A**: Mint super admin, szeretném az összes regisztrált felhasználót listázni és szerkeszteni, hogy kezeljem a platformon aktív fiókokat.
- **US-12-B**: Mint super admin, szeretném a felhasználók szerepkörét módosítani, hogy a megfelelő jogosultságokat adjam meg.
- **US-12-C**: Mint super admin, szeretném az összes menhelyet listázni és kezelni, hogy kontrollálhassam az aktív szervezeteket.
- **US-12-D**: Mint super admin, szeretném a menhelyeket hitelesíteni, hogy a felhasználók megbízhassanak a jelölt szervezetekben.
- **US-12-E**: Mint super admin, szeretném a beküldött kampányokat jóváhagyni vagy elutasítani, hogy csak megfelelő tartalom kerüljön nyilvánosságra.
- **US-12-F**: Mint super admin, szeretném az összes kampányt (nem csak a pendingeket) áttekinteni státusz szerint szűrve, hogy lássam a platform teljes gyűjtési tevékenységét.
- **US-12-G**: Mint super admin, szeretném az összes menhely összes előfizetési csomagját read-only nézetben látni, hogy átlássam a platform bevételi struktúráját.
- **US-12-H**: Mint super admin, szeretném az összes menhely előfizetőit listázni és szükség esetén lemondani egy előfizetést, hogy platformszinten kezelhessem a bevételi rekordokat.
- **US-12-I**: Mint super admin, szeretném egy felhasználói fiókot felfüggeszteni, hogy a szabályokat megsértő felhasználó ne végezhessen módosító műveleteket (kérelem beküldése, üzenetküldés, értékelés, foglalás, adományozás stb.), miközben a fiók még bejelentkezhet és böngészhet.
- **US-12-J**: Mint super admin, szeretném egy felfüggesztett felhasználó fiókját újraaktiválni, hogy visszaadjam a teljes hozzáférését, ha a probléma megoldódott.
- **US-12-K**: Mint super admin, szeretném egy felhasználói fiókot véglegesen törölni (megerősítő dialógussal), hogy eltávolítsam a platformról a nem kívánt fiókokat; a saját fiókomat és más super admin fiókokat nem tudom felfüggeszteni vagy törölni.

---

## Tesztesetek

---

### TC-12-01: Összes felhasználó listázása és keresés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin fiók; az adatbázisban legalább 3 felhasználó létezik különböző szerepkörökkel |
| **URL** | `/dashboard/users` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal kizárólag `SUPER_ADMIN` szerepkörű felhasználónak érhető el
- [ ] `SHELTER_ADMIN` és `USER` szerepkörű felhasználó átirányítódik a `/dashboard` főoldalra
- [ ] Az oldal listázza az összes regisztrált felhasználót (pagináció: max 20/oldal)
- [ ] Minden felhasználó sorában látható: neve, e-mail-je, szerepköre (badge), regisztráció dátuma, e-mail visszaigazolás státusza, kérelmek száma
- [ ] Szabad szöveges keresőmező elérhető (névre vagy e-mail-re keres)
- [ ] Szerepkör szűrő elérhető: USER, SHELTER_ADMIN, SUPER_ADMIN
- [ ] A keresés eredménye valós időben frissül (vagy gombnyomásra)
- [ ] A lapozó (pagination) funkcionál

**Tesztelési lépések:**
1. Navigálj a `/dashboard/users` oldalra kijelentkezve – ellenőrizd az átirányítást.
2. Jelentkezz be `shelter@test.hu` / `Admin1234!` SHELTER_ADMIN fiókkal – navigálj a `/dashboard/users` oldalra és ellenőrizd, hogy visszairányít.
3. Kijelentkezés, majd bejelentkezés `admin@test.hu` / `Admin1234!` super admin fiókkal.
4. Navigálj a `/dashboard/users` oldalra.
5. Ellenőrizd, hogy az összes felhasználó listázódik.
6. Ellenőrizd egy felhasználó-sor tartalmát: név, e-mail, szerepkör badge, dátum.
7. Gépeld be a keresőmezőbe: `user@test.hu` – ellenőrizd, hogy csak a megfelelő felhasználó jelenik meg.
8. Töröld a keresőt – ellenőrizd, hogy az összes felhasználó visszatér.
9. Válassz „SHELTER_ADMIN" szerepkör szűrőt – ellenőrizd, hogy csak menhely adminok jelennek meg.
10. Tesztelj lapozást, ha több mint 20 felhasználó van.

**Elvárt eredmény:**
Az oldal kizárólag super adminnak érhető el. A keresés és a szerepkör szűrő funkcionál. A listán az összes felhasználó helyes adatokkal szerepel.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-02: Felhasználó szerepkörének módosítása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; az adatbázisban létezik `USER` szerepkörű felhasználó (pl. `user@test.hu`) |
| **URL** | `/dashboard/users` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Minden felhasználó sorában elérhető egy inline `<select>` (legördülő) a szerepkör módosításához
- [ ] Elérhető szerepkörök: `USER`, `SHELTER_ADMIN`, `SUPER_ADMIN`
- [ ] A legördülő értékének megváltoztatása után az API automatikusan frissíti a szerepkört (PATCH kérés)
- [ ] A sikeres módosítás vizuálisan visszajelzésre kerül (pl. a badge megváltozik)
- [ ] A módosítás az adatbázisban is megjelenik
- [ ] A super admin a saját szerepkörét nem tudja megváltoztatni (vagy figyelmeztetés jelenik meg)
- [ ] Sikertelen módosítás esetén (pl. hálózati hiba) hibaüzenet jelenik meg és a régi érték marad

**Tesztelési lépések:**
1. Navigálj a `/dashboard/users` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg a `user@test.hu` felhasználót (aktuális szerepkör: `USER`).
3. Kattints a szerepkör legördülőre a felhasználó sorában.
4. Válaszd a `SHELTER_ADMIN` opciót.
5. Ellenőrizd, hogy az API kérés elindul (DevTools → Network → PATCH kérés a `/api/admin/users/[id]` végpontra).
6. Ellenőrizd, hogy a szerepkör badge frissül: „Menhely admin" (kék badge).
7. Frissítsd az oldalt – ellenőrizd, hogy a változtatás megmarad.
8. Változtasd vissza `USER`-re – ellenőrizd a visszaváltást.
9. Kíséreld meg a saját (`admin@test.hu`) szerepkörét módosítani – ellenőrizd, hogy figyelmeztetés vagy letiltás lép fel.

**Elvárt eredmény:**
A szerepkör módosítás azonnali és persistens. A badge frissül. A saját szerepkör módosítása nem lehetséges (vagy figyelmeztetéssel van védve).

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-03: Összes menhely listázása és aktív/inaktív szűrés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; az adatbázisban legalább 3 menhely létezik, köztük van aktív és inaktív is |
| **URL** | `/dashboard/shelters` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal kizárólag `SUPER_ADMIN` szerepkörű felhasználónak érhető el
- [ ] Listázódik az összes menhely (aktív és inaktív egyaránt)
- [ ] Minden menhely sorában látható: neve, slug, városa, címe, telefonszáma, e-mail-je, admin(ok) neve, állatok száma, aktív/inaktív státusz, hitelesítés státusza
- [ ] Szűrhető aktív (`isActive: true`) és inaktív (`isActive: false`) menhelyek szerint
- [ ] Az `isActive` és `isVerified` kapcsolók (toggle) elérhetők és működnek
- [ ] Az „Új menhely" gomb elérhető (`AddShelterForm` komponens)
- [ ] A menhely neve linkre kattintva a nyilvános profiloldalra (`/hu/shelters/[slug]`) navigál

**Tesztelési lépések:**
1. Navigálj a `/dashboard/shelters` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy az összes menhely listázódik.
3. Ellenőrizd egy menhely-sor tartalmát: neve, városa, adminok száma, állatok száma, státusz.
4. Ellenőrizd, hogy az aktív menhelyek `isActive: true` jelzéssel (pl. zöld pipa) szerepelnek.
5. Kattints az inaktív menhelyek szűrőjére (ha van) – ellenőrizd a szűrést.
6. Kattints az egyik menhely nevére – ellenőrizd, hogy a nyilvános profiloldalra navigál.
7. Kattints az „Új menhely" gombra – ellenőrizd, hogy az `AddShelterForm` megjelenik.
8. Ellenőrizd, hogy a form legalább: Menhely neve, Slug, Város, Cím mezőket tartalmaz.

**Elvárt eredmény:**
Az összes menhely listázódik a helyes adatokkal. A szűrők és a nyilvános profilra mutató link funkcionálnak.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-04: Menhely hitelesítése (isVerified toggle, badge megjelenése)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; létezik legalább egy NEM hitelesített menhely (`isVerified: false`) |
| **URL** | `/dashboard/shelters` → hatás: `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/shelters` oldalon minden menhely sorában elérhető az `isVerified` toggle kapcsoló
- [ ] Toggle bekapcsolásakor PATCH kérés indul a `/api/admin/shelters/[id]` végpontra `{ isVerified: true }` payloaddal
- [ ] A sikeres API válasz után a toggle vizuálisan bekapcsolt állapotba vált
- [ ] A menhely nyilvános profiloldalán (`/hu/shelters/[slug]`) megjelenik a `BadgeCheck` / „Hitelesített" badge
- [ ] Toggle kikapcsolásakor a badge eltűnik a nyilvános profiloldalon
- [ ] A hitelesítés nem befolyásolja az `isActive` státuszt

**Tesztelési lépések:**
1. Navigálj a `/dashboard/shelters` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg azt a menhelyet, amelyik NEM hitelesített (`isVerified: false`).
3. Jegyezd meg a menhely slug-ját (pl. `budai-allatmenhely`).
4. Navigálj a menhely nyilvános profiloldalára (`/hu/shelters/budai-allatmenhely`) – ellenőrizd, hogy NINCS „Hitelesített" badge.
5. Navigálj vissza a `/dashboard/shelters` oldalra.
6. Kapcsold be az `isVerified` toggle-t a menhely sorában.
7. Ellenőrizd, hogy a toggle bekapcsolt állapotba vált (pl. kék pipa).
8. Navigálj a menhely nyilvános profiloldalára és frissítsd az oldalt.
9. Ellenőrizd, hogy megjelent a `BadgeCheck` / „Hitelesített" / „Ellenőrzött" badge a menhely neve mellett.
10. Kapcsold vissza ki az `isVerified` toggle-t – ellenőrizd, hogy a badge eltűnik.

**Elvárt eredmény:**
A toggle aktiválása után a menhely `isVerified` mezője `true`-ra vált az adatbázisban. A nyilvános profilon megjelenik a hitelesített badge. Kikapcsoláskor eltűnik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-05: Kampány jóváhagyása (PENDING → ACTIVE)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; legalább egy `PENDING` státuszú kampány létezik (TC-07-07 lefutott, vagy seed adat) |
| **URL** | `/dashboard/campaigns` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal kizárólag `SUPER_ADMIN` szerepkörű felhasználónak érhető el
- [ ] Az oldal tetején státusz-szűrő sor látható: Összes / Jóváhagyásra vár / Aktív / Befejezett / Visszautasított
- [ ] Az összes kampány táblázatban jelenik meg: cím (kattintható link a `/donate/[id]` oldalra), menhely neve, összegyűlt / célösszeg, státusz badge, létrehozás dátuma
- [ ] A táblázat alatt (ha van PENDING kampány) megjelenik a „Jóváhagyásra vár" alcím és a `CampaignApprovals` panel részletesebb adatokkal (beküldő neve, leírás, approve/reject gombok)
- [ ] Az „Elfogad" / „Jóváhagyás" gombra kattintva a kampány `ACTIVE` státuszra vált
- [ ] A jóváhagyás után a kampány megjelenik a nyilvános `/hu/donate` oldalon
- [ ] A kampány létrehozója értesítést kap a jóváhagyásról
- [ ] A jóváhagyott kampány eltűnik a jóváhagyásra vár panelből, és ACTIVE badge-dzsel jelenik meg a táblázatban

**Tesztelési lépések:**
1. Navigálj a `/dashboard/campaigns` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy a státusz-szűrők megjelennek az oldal tetején.
3. Ellenőrizd, hogy az összes kampány táblázatban szerepel a helyes adatokkal.
4. Kattints a „Jóváhagyásra vár" szűrőre – ellenőrizd, hogy csak PENDING kampányok maradnak a táblázatban.
5. Görgess le a „Jóváhagyásra vár" panel szekciójához – keresdd a „Teszt Kampány 2026" kérelmet.
6. Kattints az „Elfogad" / „Jóváhagyás" gombra.
7. Ellenőrizd, hogy a kampány eltűnt a jóváhagyásra vár panelből.
8. Kattints az „Összes" szűrőre – ellenőrizd, hogy a kampány ACTIVE badge-dzsel megjelenik a táblázatban.
9. Navigálj a `/hu/donate` nyilvános oldalra – ellenőrizd, hogy „Teszt Kampány 2026" megjelenik az aktív kampányok között.
10. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és ellenőrizd, hogy értesítés érkezett: „Kampányod jóváhagyva".

**Elvárt eredmény:**
A kampány `ACTIVE` státuszra vált, megjelenik a nyilvános kampánylistán és a Gyűjtések táblázatban ACTIVE badge-dzsel. A kampány létrehozója értesítést kap.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-06: Kampány elutasítása (PENDING → REJECTED, menhely értesítése)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; legalább egy `PENDING` státuszú kampány létezik (hozz létre egy újat TC-07-07 alapján, vagy seed adat) |
| **URL** | `/dashboard/campaigns` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Elutasít" / „Visszautasítás" gomb elérhető a PENDING kampány mellett
- [ ] Elutasítás előtt opcionálisan indoklás megadható
- [ ] Az elutasítás után a kampány `REJECTED` státuszra vált az adatbázisban
- [ ] A kampány NEM jelenik meg a nyilvános `/hu/donate` oldalon
- [ ] A kampány létrehozója értesítést kap az elutasításról (opcionálisan az indoklással)
- [ ] Az elutasított kampány eltűnik a PENDING listából a `/dashboard/campaigns` oldalon
- [ ] A kampány nem válik publikussá semmilyen körülmény között (sem most, sem később, ha `REJECTED`)

**Tesztelési lépések:**
1. Hozz létre egy új kampányt `user@test.hu` fiókkal: navigálj a `/hu/campaigns/new` oldalra és küldj be egy tesztkampányt (pl. „Elutasítandó Teszt Kampány", célösszeg: 10000).
2. Navigálj a `/dashboard/campaigns` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
3. Azonosítsd az „Elutasítandó Teszt Kampány" PENDING kérelmet.
4. Opcionálisan add meg az indoklást: `A kampány nem felel meg a platform irányelveknek.`
5. Kattints az „Elutasít" / „Visszautasítás" gombra.
6. Ellenőrizd, hogy megerősítő dialógus jelenik meg.
7. Erősítsd meg az elutasítást.
8. Ellenőrizd, hogy a kampány eltűnt a PENDING listából.
9. Navigálj a `/hu/donate` nyilvános oldalra – ellenőrizd, hogy „Elutasítandó Teszt Kampány" NEM jelenik meg.
10. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és ellenőrizd, hogy értesítés érkezett: „Kampányod elutasítva" (esetleg indoklással).

**Elvárt eredmény:**
A kampány `REJECTED` státuszra vált, a nyilvános oldalon nem jelenik meg, a kampány létrehozója értesítést kap. Az elutasított kampány nem tehető nyilvánossá.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-07: Összes gyűjtés áttekintése státusz szerinti szűréssel

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; az adatbázisban legalább egy ACTIVE és egy PENDING kampány létezik |
| **URL** | `/dashboard/campaigns` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal betöltésekor (szűrő nélkül) az összes kampány látható a táblázatban, státuszuktól függetlenül
- [ ] A státusz szűrők: „Összes", „Jóváhagyásra vár", „Aktív", „Befejezett", „Visszautasított"
- [ ] Szűrő kiválasztásakor az URL frissül (`?status=ACTIVE` stb.) és csak a megfelelő státuszú kampányok maradnak
- [ ] Minden táblázat-sorban látható: kampány cím (link), menhely neve, összegyűlt Ft / célösszeg Ft, státusz badge (színkódolt), létrehozás dátuma
- [ ] A kampány cím linkje a publikus `/hu/donate/[id]` oldalra vezet (új lap nem szükséges, de a navigáció működik)
- [ ] Ha egy státuszhoz 0 kampány tartozik, a táblázat üres állapot üzenetet mutat
- [ ] Az oldal kizárólag `SUPER_ADMIN` szerepkörű felhasználónak érhető el; `SHELTER_ADMIN` átirányítódik

**Tesztelési lépések:**
1. Navigálj a `/dashboard/campaigns` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy az összes kampány szerepel a táblázatban (PENDING, ACTIVE, COMPLETED, REJECTED vegyesen).
3. Kattints az „Aktív" szűrőre – ellenőrizd, hogy csak ACTIVE státuszú kampányok jelennek meg.
4. Kattints a „Jóváhagyásra vár" szűrőre – ellenőrizd, hogy csak PENDING kampányok jelennek meg.
5. Kattints a „Befejezett" szűrőre – ha nincs befejezett kampány, ellenőrizd az üres állapot üzenetet.
6. Kattints a „Visszautasított" szűrőre – ellenőrizd a REJECTED kampányokat.
7. Kattints az „Összes" szűrőre – ellenőrizd, hogy minden kampány visszatér.
8. Kattints egy kampány-sor nevére – ellenőrizd, hogy a `/hu/donate/[id]` oldalra navigál.
9. Kíséreld meg a `/dashboard/campaigns` oldalt SHELTER_ADMIN fiókkal (`shelter@test.hu`) elérni – ellenőrizd az átirányítást.

**Elvárt eredmény:**
A státusz-szűrők funkcionálnak, az URL frissül, a táblázat a megfelelő kampányokat mutatja. A kampány cím link funkcionál. SHELTER_ADMIN nem érheti el az oldalt.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-08: Előfizetési csomagok platformszintű áttekintése (SUPER_ADMIN)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; legalább két menhely rendelkezik aktív `DonationTier` csomagokkal |
| **URL** | `/dashboard/tiers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/tiers` oldal `SUPER_ADMIN` számára read-only táblázatot jelenít meg (NEM a `TiersManager` szerkesztő komponenst)
- [ ] A táblázatban minden `DonationTier` látható az összes menhelyről
- [ ] Minden sor tartalmazza: csomag neve, menhely neve + városa, összeg (Ft/hó), aktív előfizetők száma, állapot badge (Aktív / Inaktív)
- [ ] A sorok menhely neve szerint ABC sorrendbe rendezetten jelennek meg, azon belül összeg szerint növekvően
- [ ] Ha nincs egyetlen csomag sem, üres állapot üzenet jelenik meg
- [ ] A táblázat NEM tartalmaz szerkesztési/törlési gombokat (SUPER_ADMIN csak megtekinthet)
- [ ] `SHELTER_ADMIN` számára a szokott `TiersManager` szerkesztő jelenik meg (saját menhelyéhez)

**Tesztelési lépések:**
1. Navigálj a `/dashboard/tiers` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy read-only táblázat jelenik meg (NEM a TiersManager szerkesztő).
3. Ellenőrizd a táblázat oszlopait: Csomag neve, Menhely, Összeg/hó, Aktív előfizetők, Állapot.
4. Ellenőrizd, hogy legalább két különböző menhely csomagjai megjelennek.
5. Ellenőrizd a sorrendet: menhelyek ABC-ben, azon belül összeg növekvően.
6. Ellenőrizd, hogy aktív előfizetők száma helyes értéket mutat (valós adat).
7. Ellenőrizd, hogy nincs „Szerkesztés" vagy „Törlés" gomb.
8. Kijelentkezés, majd bejelentkezés `shelter@test.hu` / `Admin1234!` fiókkal.
9. Navigálj a `/dashboard/tiers` oldalra – ellenőrizd, hogy a `TiersManager` komponens jelenik meg (szerkeszthető csomagok saját menhelyhez).

**Elvárt eredmény:**
SUPER_ADMIN read-only táblázatban látja az összes menhely összes előfizetési csomagját. SHELTER_ADMIN a saját menhelyének szerkeszthető `TiersManager` felületét látja.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-09: Előfizetések platformszintű kezelése (SUPER_ADMIN)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; legalább egy `ACTIVE` és egy `CANCELLED` előfizetés létezik különböző menhelyekhez |
| **URL** | `/dashboard/subscriptions` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal betöltésekor az összes menhely összes előfizetése látható (nincs shelter-szűrés)
- [ ] Minden sorban látható: előfizető neve, e-mail-je, csomag neve, **menhely neve** (SUPER_ADMIN-exkluzív oszlop), összeg (HUF/hó), státusz badge, kezdés dátuma, lemondás gomb (csak ACTIVE-nál)
- [ ] A státusz-szűrők (Összes / Aktív / Lemondott) funkcionálnak, URL frissül
- [ ] Az „Aktív" szűrőre kattintva csak `ACTIVE` státuszú előfizetések jelennek meg
- [ ] A „Lemondás" gombra kattintva az előfizetés `CANCELLED` státuszra vált (adminisztratív lemondás, `POST /api/subscriptions/[id]/admin-cancel`)
- [ ] Az Adományok CSV és Előfizetők CSV exportáló gombok elérhetők és letöltik a helyes fájlt
- [ ] Az oldal max. 100 előfizetést jelenít meg (pagináció hiányában ez a limit)

**Tesztelési lépések:**
1. Navigálj a `/dashboard/subscriptions` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy az összes menhely előfizetései megjelennek (nem csak egy menhely).
3. Ellenőrizd, hogy a „Menhely neve" oszlop látható (ez csak SUPER_ADMIN-nál jelenik meg).
4. Kattints az „Aktív" szűrőre – ellenőrizd, hogy csak ACTIVE státuszú előfizetések maradnak.
5. Kattints a „Lemondott" szűrőre – ellenőrizd, hogy csak CANCELLED státuszú előfizetések maradnak.
6. Kattints az „Összes" szűrőre – ellenőrizd, hogy minden visszatér.
7. Kattints egy ACTIVE előfizetés „Lemondás" gombjára – erősítsd meg a lemondást.
8. Ellenőrizd, hogy az előfizetés státusza `CANCELLED`-re változott.
9. Kattints az „Adományok CSV" gombra – ellenőrizd, hogy CSV fájl letöltés indul a helyes adatokkal.
10. Kattints az „Előfizetők CSV" gombra – ellenőrizd, hogy CSV fájl letöltés indul.
11. Kijelentkezés, majd bejelentkezés `shelter@test.hu` / `Admin1234!` fiókkal.
12. Navigálj a `/dashboard/subscriptions` oldalra – ellenőrizd, hogy csak a saját menhely előfizetései láthatók és a „Menhely neve" oszlop NEM jelenik meg.

**Elvárt eredmény:**
SUPER_ADMIN az összes menhely összes előfizetését látja, beleértve a menhely nevét. Az admin-lemondás funkcionál. SHELTER_ADMIN csak a saját menhely előfizetéseit látja.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-10: Felhasználó felfüggesztése és a módosító művelet blokkolása (403)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; az adatbázisban létezik `USER` szerepkörű, aktív (nem felfüggesztett) felhasználó (pl. `user@test.hu`) |
| **URL** | `/dashboard/users` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Minden felhasználó sorában elérhető a „Felfüggesztés" gomb (amber/borostyán színű), kivéve a super admin saját sorát és más `SUPER_ADMIN` sorokat
- [ ] A „Felfüggesztés" gombra kattintva `PATCH /api/admin/users/[id]` kérés indul `{ suspended: true }` payloaddal
- [ ] A sikeres válasz után a felhasználó sora piros árnyalatú lesz, és megjelenik egy piros „Felfüggesztve" badge
- [ ] A felhasználó `suspendedAt` mezője kitöltődik (és opcionálisan a `suspendedReason`)
- [ ] A felfüggesztett felhasználó továbbra is be tud jelentkezni és böngészheti a nyilvános oldalakat
- [ ] A felfüggesztett felhasználó bármely módosító művelete HTTP 403-mal elutasításra kerül (`blockIfSuspended()` őr): örökbefogadási kérelem beküldése, üzenetküldés, értékelés írása, időpontfoglalás, önkéntes/ideiglenes befogadó jelentkezés, kedvencek, kampányindítás, adományozás/előfizetés/szponzorálás, bejelentés (report) létrehozása
- [ ] A felfüggesztett felhasználó egyértelmű hibaüzenetet kap arról, hogy a fiókja fel van függesztve
- [ ] A super admin a saját sorában NEM lát „Felfüggesztés" gombot

**Tesztelési lépések:**
1. Navigálj a `/dashboard/users` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy a saját (`admin@test.hu`) sorban nincs „Felfüggesztés" gomb.
3. Keresd meg a `user@test.hu` felhasználót – ellenőrizd, hogy a sorában van amber színű „Felfüggesztés" gomb.
4. Kattints a „Felfüggesztés" gombra.
5. Ellenőrizd (DevTools → Network), hogy `PATCH /api/admin/users/[id]` indul `{ suspended: true }` payloaddal.
6. Ellenőrizd, hogy a felhasználó sora piros árnyalatú lesz és megjelenik a piros „Felfüggesztve" badge.
7. Jelentkezz ki, majd jelentkezz be `user@test.hu` / `User1234!` fiókkal – ellenőrizd, hogy a bejelentkezés sikeres és a nyilvános oldalak böngészhetők.
8. Kísérelj meg egy módosító műveletet (pl. örökbefogadási kérelem beküldése egy állat adatlapján, vagy üzenet küldése egy menhelynek).
9. Ellenőrizd, hogy a művelet HTTP 403-mal elutasításra kerül, és egyértelmű üzenet jelenik meg, hogy a fiók fel van függesztve.

**Elvárt eredmény:**
A felhasználó felfüggesztésre kerül: `suspendedAt` kitöltődik, a sor piros árnyalatú lesz „Felfüggesztve" badge-dzsel. A felfüggesztett felhasználó bejelentkezhet és böngészhet, de minden módosító művelete 403-mal blokkolódik, egyértelmű hibaüzenettel. A super admin a saját sorát nem tudja felfüggeszteni.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-11: Felfüggesztett felhasználó újraaktiválása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; létezik egy felfüggesztett felhasználó (pl. TC-12-10 lefutott a `user@test.hu` fiókra) |
| **URL** | `/dashboard/users` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A felfüggesztett felhasználó sorában a „Felfüggesztés" gomb helyett egy zöld „Aktiválás" gomb jelenik meg
- [ ] Az „Aktiválás" gombra kattintva `PATCH /api/admin/users/[id]` kérés indul `{ suspended: false }` payloaddal
- [ ] A sikeres válasz után eltűnik a piros „Felfüggesztve" badge és a sor piros árnyalata, a sor visszaáll normál állapotba
- [ ] A felhasználó `suspendedAt` (és `suspendedReason`) mezője kiürül (null)
- [ ] Az újraaktivált felhasználó minden módosító művelete ismét engedélyezett (nincs 403)

**Tesztelési lépések:**
1. Navigálj a `/dashboard/users` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg a felfüggesztett `user@test.hu` felhasználót – ellenőrizd a piros „Felfüggesztve" badge-et és a zöld „Aktiválás" gombot.
3. Kattints az „Aktiválás" gombra.
4. Ellenőrizd (DevTools → Network), hogy `PATCH /api/admin/users/[id]` indul `{ suspended: false }` payloaddal.
5. Ellenőrizd, hogy a badge és a piros árnyalat eltűnik, és ismét megjelenik az amber „Felfüggesztés" gomb.
6. Jelentkezz ki, majd jelentkezz be `user@test.hu` / `User1234!` fiókkal.
7. Végezz el egy korábban blokkolt módosító műveletet (pl. üzenetküldés egy menhelynek) – ellenőrizd, hogy immár sikeres (nincs 403).

**Elvárt eredmény:**
A felhasználó újraaktiválódik: a `suspendedAt` kiürül, a badge és a piros árnyalat eltűnik. A felhasználó módosító műveletei ismét engedélyezettek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-12-12: Felhasználó törlése megerősítő dialógussal és a saját/super admin védelmek

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `admin@test.hu` / `Admin1234!` super admin; az adatbázisban létezik egy törölhető teszt-felhasználó (`USER` szerepkör), valamint legalább még egy `SUPER_ADMIN` fiók a védelmek teszteléséhez |
| **URL** | `/dashboard/users` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Minden felhasználó sorában elérhető egy piros „Törlés" (kuka ikon) gomb, kivéve a super admin saját sorát és más `SUPER_ADMIN` sorokat
- [ ] A „Törlés" gombra kattintva megerősítő dialógus jelenik meg (a törlés csak megerősítés után történik meg)
- [ ] Megerősítés után `DELETE /api/admin/users/[id]` kérés indul, és a felhasználó eltűnik a listából
- [ ] A felhasználó véglegesen törlődik az adatbázisból
- [ ] A super admin a saját fiókját NEM tudja törölni (nincs gomb, vagy az API 403-mal elutasít)
- [ ] Egy másik `SUPER_ADMIN` fiók NEM törölhető (nincs gomb, vagy az API 403-mal elutasít)
- [ ] Ugyanezek a védelmek a felfüggesztésre is érvényesek: a saját és más super admin fiók nem függeszthető fel

**Tesztelési lépések:**
1. Navigálj a `/dashboard/users` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy a saját (`admin@test.hu`) sorban nincs „Törlés" gomb.
3. Ellenőrizd, hogy egy másik `SUPER_ADMIN` felhasználó sorában sincs „Törlés" (és „Felfüggesztés") gomb.
4. Keresd meg a törölhető teszt-felhasználót – kattints a piros „Törlés" (kuka) gombra.
5. Ellenőrizd, hogy megerősítő dialógus jelenik meg.
6. Szakítsd meg (Mégse) – ellenőrizd, hogy a felhasználó megmarad a listában.
7. Kattints ismét a „Törlés" gombra, majd erősítsd meg.
8. Ellenőrizd (DevTools → Network), hogy `DELETE /api/admin/users/[id]` indul.
9. Ellenőrizd, hogy a felhasználó eltűnik a listából és oldalfrissítés után sem tér vissza.

**Elvárt eredmény:**
A felhasználó törlése csak megerősítő dialógus után történik meg, és véglegesen eltávolítja a fiókot. A super admin a saját fiókját és más super admin fiókokat nem tudja törölni vagy felfüggeszteni.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
