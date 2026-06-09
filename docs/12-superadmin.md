# 12 – Super Admin funkciók

## Összefoglalás

Ez a modul fedi le a Super Admin kizárólagos funkcióit. A `SUPER_ADMIN` szerepkörű felhasználó (`admin@test.hu`) teljes körű hozzáféréssel rendelkezik a platformhoz: listázhatja és szerkesztheti az összes felhasználót és menhelyet, hitelesítheti a menhelyeket (verified badge), jóváhagyhatja vagy elutasíthatja a kampányokat. A Super Admin dashboard ugyanazon `/dashboard` útvonalon érhető el, de kiegészítő szekciókkal rendelkezik, amelyek `SHELTER_ADMIN` számára nem láthatók (pl. `/dashboard/users`, `/dashboard/shelters`, `/dashboard/campaigns`).

---

## Felhasználói Történetek

- **US-12-A**: Mint super admin, szeretném az összes regisztrált felhasználót listázni és szerkeszteni, hogy kezeljem a platformon aktív fiókokat.
- **US-12-B**: Mint super admin, szeretném a felhasználók szerepkörét módosítani, hogy a megfelelő jogosultságokat adjam meg.
- **US-12-C**: Mint super admin, szeretném az összes menhelyet listázni és kezelni, hogy kontrollálhassam az aktív szervezeteket.
- **US-12-D**: Mint super admin, szeretném a menhelyeket hitelesíteni, hogy a felhasználók megbízhassanak a jelölt szervezetekben.
- **US-12-E**: Mint super admin, szeretném a beküldött kampányokat jóváhagyni vagy elutasítani, hogy csak megfelelő tartalom kerüljön nyilvánosságra.

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
- [ ] A `PENDING` státuszú kampányok listázódnak (`CampaignApprovals` komponens)
- [ ] Minden kampány sorában látható: cím, leírás, célösszeg, beküldő neve, e-mail-je, menhely neve (ha van), létrehozás dátuma
- [ ] Az „Elfogad" / „Jóváhagyás" gombra kattintva a kampány `ACTIVE` státuszra vált
- [ ] A jóváhagyás után a kampány megjelenik a nyilvános `/hu/donate` oldalon
- [ ] A kampány létrehozója értesítést kap a jóváhagyásról
- [ ] A jóváhagyott kampány eltűnik a `/dashboard/campaigns` PENDING listájából

**Tesztelési lépések:**
1. Navigálj a `/dashboard/campaigns` oldalra bejelentkezve `admin@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy a `PENDING` kampányok listázódnak.
3. Ellenőrizd a kampány-sor tartalmát: cím, leírás, célösszeg, beküldő.
4. Kattints az „Elfogad" / „Jóváhagyás" gombra a „Teszt Kampány 2026" (TC-07-07-ből) mellett.
5. Ellenőrizd, hogy a kampány eltűnt a PENDING listából.
6. Navigálj a `/hu/donate` nyilvános oldalra – ellenőrizd, hogy „Teszt Kampány 2026" megjelenik az aktív kampányok között.
7. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és ellenőrizd, hogy értesítés érkezett: „Kampányod jóváhagyva".

**Elvárt eredmény:**
A kampány `ACTIVE` státuszra vált, megjelenik a nyilvános kampánylistán, a kampány létrehozója értesítést kap.

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
