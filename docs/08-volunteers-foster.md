# 08 – Önkéntesség, ideiglenes befogadás

## Összefoglalás

Ez a modul fedi le az önkéntesi és ideiglenes befogadói rendszert. A felhasználók önkéntes munkára jelentkezhetnek a menhely profiloján keresztül (`VolunteerApplyButton`), az adminok jóváhagyhatják vagy elutasíthatják a kérelmeket, és nyilvános feladatokat hirdethetnek meg. Az ideiglenes befogadói rendszer (`FosterApplyButton`) lehetővé teszi, hogy felhasználók állatok ideiglenes gondozását vállalják, az adminok kezeljék a befogadói kérelmeket, és ellátmány-napló bejegyzéseket rögzítsenek. A saját önkéntességi és feladatjelentkezési állapot a `/hu/volunteers` oldalon tekinthető meg.

---

## Felhasználói Történetek

- **US-08-A**: Mint bejelentkezett felhasználó, szeretnék önkéntes munkára jelentkezni egy menhely profilján, hogy aktívan segítsek az állatoknak.
- **US-08-B**: Mint menhely adminisztrátor, szeretném jóváhagyni az önkéntes kérelmeket, hogy kontrolláljam a csapatomat.
- **US-08-C**: Mint menhely adminisztrátor, szeretnék feladatokat meghirdetni az önkénteseknek, hogy szervezett munkát biztosítsak.
- **US-08-D**: Mint aktív önkéntes, szeretnék feladatokra feljelentkezni, hogy tudjam, mikor és mire van szükség.
- **US-08-E**: Mint bejelentkezett felhasználó, szeretnék ideiglenes befogadói profilt létrehozni, hogy átmenetileg otthont adjak egy állatnak.
- **US-08-F**: Mint menhely adminisztrátor, szeretném jóváhagyni a befogadói kérelmeket és ellátmány-naplót vezetni, hogy nyomon kövessem a befogadott állatok gondozását.
- **US-08-G**: Mint önkéntes, szeretném látni saját önkéntességi státuszaimat és a felvett feladataimat, hogy naprakész legyek.

---

## Tesztesetek

---

### TC-08-01: Önkéntes jelentkezés menhely profilján

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó (`user@test.hu`); legalább egy aktív menhely létezik seed adatokban; a felhasználónak nincs korábbi önkéntesi kérelme az adott menhelyhez |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely profiloldalán megjelenik a `VolunteerApplyButton` komponens
- [ ] Bejelentkezés nélkül a gomb nem elérhető, vagy bejelentkezésre hív fel
- [ ] A gombra kattintva modal/form nyílik meg: motiváció, készségek, elérhetőség mezőkkel
- [ ] Az összes mező opcionális, a form üres mezőkkel is beküldhető
- [ ] Sikeres beküldés után a gomb státuszbadge-re változik: „Önkéntes jelentkezés elbírálás alatt"
- [ ] Az adatbázisban `Volunteer` rekord jön létre `PENDING` státusszal a helyes `userId` és `shelterId` értékekkel
- [ ] Ugyanazon menhelyhez nem lehet kétszer jelentkezni (a gomb inaktív lesz, vagy hibaüzenet jelenik meg)

**Tesztelési lépések:**
1. Navigálj a `/hu/shelters` oldalra és kattints egy aktív menhely profilkártyájára.
2. A menhely profiloldalán keresd meg az „Önkéntes leszek" / `VolunteerApplyButton` gombot.
3. Kattints a gombra bejelentkezés nélkül – ellenőrizd, hogy bejelentkezési felhívást kap.
4. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj vissza a menhely profilra.
5. Kattints az „Önkéntes leszek" gombra.
6. Ellenőrizd, hogy modal/panel nyílik motiváció, készségek és elérhetőség mezőkkel.
7. Töltsd ki az opcionális mezőket:
   - Motiváció: `Segíteni szeretnék az állatoknak.`
   - Készségek: `Állatgondozás, autóvezetés`
   - Elérhetőség: `Hétvégente egész nap`
8. Kattints a „Jelentkezés" / „Beküldés" gombra.
9. Ellenőrizd, hogy a gomb státuszbadge-re változott: „Önkéntes jelentkezés elbírálás alatt".
10. Frissítsd az oldalt – ellenőrizd, hogy a badge megmarad.

**Elvárt eredmény:**
A `Volunteer` rekord `PENDING` státusszal jön létre az adatbázisban. A gomb helyett a státuszbadge jelenik meg. Ismételt kísérlet esetén a gomb inaktív vagy hibaüzenet jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-02: Admin jóváhagyja az önkéntes kérelmet

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | TC-08-01 sikeresen lefutott; bejelentkezve `shelter@test.hu` / `Admin1234!` admin fiókkal; az adott önkéntesi kérelem `PENDING` státuszban van |
| **URL** | `/dashboard/volunteers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/volunteers` oldal betölt és listázza a menhely összes önkéntesi kérelmét
- [ ] A `PENDING` státuszú kérelmek jelölten megjelennek (pl. sárga badge)
- [ ] Az „Elfogad" gombra kattintva a státusz `ACTIVE`-ra vált
- [ ] Az „Elutasít" gombra kattintva a státusz `REJECTED`-re vált
- [ ] Az önkéntes felhasználó értesítést kap a döntésről (notification rekord jön létre)
- [ ] Jóváhagyás után az önkéntes neve és e-mail-je megjelenik az aktív önkéntesek listájában
- [ ] Az `ACTIVE` önkénteshez hozzárendelhető feladat

**Tesztelési lépések:**
1. Navigálj a `/dashboard/volunteers` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg a `user@test.hu` felhasználó `PENDING` önkéntesi kérelmét.
3. Ellenőrizd, hogy a kérelem részletei (motiváció, készségek, elérhetőség) láthatók.
4. Kattints az „Elfogad" / „Jóváhagyás" gombra.
5. Ellenőrizd, hogy a kérelem státusza `ACTIVE`-ra vált (zöld badge).
6. Jelentkezz be `user@test.hu` / `User1234!` fiókkal, és navigálj a csengő értesítésekhez.
7. Ellenőrizd, hogy megjelent egy értesítés: önkéntesi kérelem jóváhagyva.
8. Navigálj a `/hu/volunteers` oldalra és ellenőrizd, hogy az aktív önkéntesség megjelenik.

**Elvárt eredmény:**
A `Volunteer` rekord `ACTIVE` státuszra vált az adatbázisban. A felhasználó értesítést kap. Az önkéntes megjelenik az aktív önkéntesek listájában.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-03: Admin feladatot hirdet meg önkénteseknek

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezve `shelter@test.hu` / `Admin1234!`; legalább egy aktív önkéntes létezik a menhely alatt |
| **URL** | `/dashboard/volunteers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az admin tud új feladatot (`VolunteerTask`) létrehozni a dashboard-on
- [ ] A form mezői: Cím (kötelező), Leírás (opcionális), Időpont (`scheduledAt`, kötelező), Szükséges önkéntesek száma
- [ ] A feladat `OPEN` státusszal jön létre
- [ ] A feladat megjelenik az önkéntesek számára elérhető feladatlistában (`/hu/volunteers`)
- [ ] Kötelező mező hiánya esetén hibaüzenet jelenik meg

**Tesztelési lépések:**
1. Navigálj a `/dashboard/volunteers` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg az „Új feladat" / „Feladat meghirdetése" gombot és kattints rá.
3. Töltsd ki a form mezőit:
   - Cím: `Állatgondozás – hétvégi smúfórásdíj`
   - Leírás: `Reggeli etetés és karám takarítás.`
   - Időpont: válassz egy jövőbeli dátumot (pl. `2026-06-20 09:00`)
   - Szükséges létszám: `3`
4. Kattints a „Feladat közzététele" gombra.
5. Ellenőrizd, hogy a feladat `OPEN` státusszal megjelenik a feladatlistában.
6. Próbálj meg egy feladatot üres cím mezővel beküldeni – ellenőrizd a hibaüzenetet.

**Elvárt eredmény:**
A `VolunteerTask` rekord `OPEN` státusszal jön létre az adatbázisban. A feladat megjelenik a dashboard feladatlistájában és az önkéntesek számára elérhető `/hu/volunteers` oldalon is.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-04: Önkéntes feljelentkezik feladatra

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` aktív önkéntes (TC-08-02 lefutott); legalább egy `OPEN` státuszú feladat létezik a menhely alatt (TC-08-03 lefutott vagy seed adat); a feladat időpontja a jövőben van |
| **URL** | `/hu/volunteers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/volunteers` oldalon az elérhető feladatok listázódnak az aktív önkéntes menhelyeihez
- [ ] Minden feladatnál látható: cím, időpont, leírás, szükséges/jelentkezett létszám
- [ ] A „Feljelentkezés" gombra kattintva a felhasználó hozzárendelődik a feladathoz
- [ ] A gomb inaktívvá válik (pl. „Feljelentkeztél") sikeres feljelentkezés után
- [ ] Ha a feladat betelt (elérte a max létszámot), a gomb „Betelt" jelzéssel inaktív
- [ ] Az admin dashboard `assignments` listájában megjelenik az új hozzárendelés

**Tesztelési lépések:**
1. Navigálj a `/hu/volunteers` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Ellenőrizd, hogy az elérhető feladatok szekció betölt az aktív menhely feladataival.
3. Keresd meg a TC-08-03-ban létrehozott feladatot.
4. Ellenőrizd a feladat részleteit: cím, időpont, szükséges létszám.
5. Kattints a „Feljelentkezés" gombra.
6. Ellenőrizd, hogy a gomb megváltozik (pl. „Feljelentkeztél" vagy pipa ikon).
7. Frissítsd az oldalt – ellenőrizd, hogy az állapot megmarad.
8. Navigálj a `/dashboard/volunteers` oldalra admin fiókkal és ellenőrizd, hogy a feljelentkezés megjelenik a feladat részleteinél.

**Elvárt eredmény:**
A `VolunteerAssignment` rekord létrejön, a feladat gombja inaktívra vált. Az admin dashboard-on megjelenik a feljelentkezés.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-05: Ideiglenes befogadói profil létrehozása menhely profilján

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó (`user@test.hu`); legalább egy aktív menhely létezik; a felhasználónak nincs korábbi aktív befogadói kérelme az adott menhelyhez |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely profiloldalán megjelenik a `FosterApplyButton` komponens
- [ ] Bejelentkezés nélkül a gomb nem elérhető
- [ ] A gombra kattintva form/modal nyílik: tapasztalat, lakáskörülmények, elérhetőség mezőkkel
- [ ] Sikeres beküldés után a gomb státuszbadge-re változik: „Befogadói kérelem elbírálás alatt"
- [ ] Az adatbázisban `FosterProfile` rekord jön létre `PENDING` státusszal
- [ ] Ugyanazon menhelyhez nem lehet kétszer befogadói kérelmet benyújtani

**Tesztelési lépések:**
1. Navigálj egy menhely profiloldalára (`/hu/shelters/[slug]`) bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Keresd meg az „Ideiglenes befogadó leszek" / `FosterApplyButton` gombot.
3. Kattints a gombra.
4. Ellenőrizd, hogy form/modal nyílik a befogadói adatokhoz.
5. Töltsd ki az opciólis mezőket:
   - Tapasztalat: `5 éve tartok cicát, korábban kutyát is neveltem.`
   - Lakáskörülmények: `Kertkapcsolatos lakás, 80 nm`
   - Elérhetőség: `1-2 héttől 1 hónapig vállalok`
6. Kattints a „Jelentkezés" gombra.
7. Ellenőrizd, hogy a gomb helyén megjelenik a „Befogadói kérelem elbírálás alatt" badge.
8. Frissítsd az oldalt – ellenőrizd, hogy a badge megmarad.
9. Próbálj meg újra rákattintani – ellenőrizd, hogy a gomb inaktív.

**Elvárt eredmény:**
A `FosterProfile` rekord `PENDING` státusszal jön létre. A gomb státuszbadge-re változik. Duplikált kérelem nem nyújtható be.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-06: Admin jóváhagyja a befogadói kérelmet

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | TC-08-05 sikeresen lefutott; bejelentkezve `shelter@test.hu` / `Admin1234!`; van `PENDING` befogadói kérelem |
| **URL** | `/dashboard/foster` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/foster` oldal betölt és listázza a menhely befogadói kérelmeit
- [ ] `PENDING` státuszú kérelmek jelölten megjelennek
- [ ] Az „Elfogad" gombra kattintva a státusz `APPROVED`-ra vált
- [ ] Az „Elutasít" gombra kattintva a státusz `REJECTED`-re vált
- [ ] Jóváhagyás után hozzárendelhető egy állat a befogadóhoz (`FosterAssign`)
- [ ] A befogadó felhasználó értesítést kap a döntésről

**Tesztelési lépések:**
1. Navigálj a `/dashboard/foster` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg a `user@test.hu` felhasználó `PENDING` befogadói kérelmét.
3. Ellenőrizd, hogy a kérelem részletei (tapasztalat, lakáskörülmények, elérhetőség) láthatók.
4. Kattints az „Elfogad" / „Jóváhagyás" gombra.
5. Ellenőrizd, hogy a státusz `APPROVED`-ra vált (zöld badge).
6. Ellenőrizd, hogy megjelenik az állat-hozzárendelési lehetőség (`FosterAssign` komponens).
7. Jelentkezz be `user@test.hu` fiókkal és ellenőrizd, hogy értesítés érkezett a jóváhagyásról.

**Elvárt eredmény:**
A `FosterProfile` rekord `APPROVED` státuszra vált. A befogadóhoz állat rendelhető hozzá. A felhasználó értesítést kap.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-07: Ellátmány-napló bejegyzés hozzáadása befogadóhoz

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Létezik jóváhagyott (`APPROVED`) befogadói profil (TC-08-06 lefutott); legalább egy készlet-tétel (`InventoryItem`) létezik a menhely alatt; bejelentkezve `shelter@test.hu` / `Admin1234!` |
| **URL** | `/dashboard/foster` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az `APPROVED` státuszú befogadói profilnál megjelenik az „Ellátmány rögzítése" / ellátmány-napló funkció
- [ ] Az admin kiválaszthat egy készlet-tételt (`InventoryItem`) és megadhatja a mennyiséget
- [ ] Sikeres mentés után a `SupplyLog` rekord jön létre az adatbázisban
- [ ] A befogadói profil oldalon megjelennek a korábbi ellátmány-napló bejegyzések (legutóbbi 10)
- [ ] A bejegyzés dátuma, a tétel neve, mennyisége és egysége látható
- [ ] Az ellátmány rögzítése csökkenti a menhely készletét (OUT mozgás)

**Tesztelési lépések:**
1. Navigálj a `/dashboard/foster` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg az `APPROVED` státuszú befogadói profilt.
3. Kattints a „Ellátmány rögzítése" / „Napló hozzáadása" gombra.
4. Válassz ki egy készlet-tételt a legördülő listából (pl. „Kutya táp").
5. Add meg a mennyiséget: `5`.
6. Kattints a „Mentés" gombra.
7. Ellenőrizd, hogy a napló bejegyzés megjelenik a befogadói profil ellátmány-napló szekciójában.
8. Navigálj a `/dashboard/inventory` oldalra és ellenőrizd, hogy a „Kutya táp" készlete csökkent 5 egységgel.

**Elvárt eredmény:**
A `SupplyLog` rekord létrejön az adatbázisban. A befogadói profilnál megjelenik a napló bejegyzés. A menhely készlete csökken a kiadott mennyiséggel.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-08-08: Saját önkéntességi státusz megtekintése

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | `user@test.hu` rendelkezik legalább egy önkéntesi bejegyzéssel (bármilyen státuszban); TC-08-02 és TC-08-04 sikeresen lefutott |
| **URL** | `/hu/volunteers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül nem érhető el – átirányít a bejelentkezési oldalra
- [ ] Az oldal betölt és listázza a felhasználó összes önkénteskedési bejegyzését (`VolunteerDashboard` komponens)
- [ ] Minden bejegyzésnél látható a menhely neve, városa, az önkéntesség státusza és a csatlakozás dátuma
- [ ] Az aktív (`ACTIVE`) önkéntes menhelyekhez tartozó elérhető feladatok listázódnak
- [ ] A már felvett feladatok külön szekcióban jelennek meg
- [ ] A részvételi napló (`attendances`) megjelenik, ha van bejegyzés
- [ ] `PENDING` státuszú kérelem esetén „elbírálás alatt" jelzés látható

**Tesztelési lépések:**
1. Navigálj a `/hu/volunteers` URL-re kijelentkezve – ellenőrizd az átirányítást.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal.
3. Navigálj a `/hu/volunteers` oldalra.
4. Ellenőrizd, hogy a `VolunteerDashboard` komponens betölt az önkéntességi bejegyzéssel.
5. Ellenőrizd a menhely nevét, városát és az `ACTIVE` státuszt.
6. Ellenőrizd, hogy az elérhető feladatok szekció tartalmazza a TC-08-04-ben felvett feladatot „Feljelentkeztél" jelzéssel.
7. Ellenőrizd, hogy a részvételi napló szekció megjelenik (esetleg üres, ha még nem volt jelenlét).

**Elvárt eredmény:**
Az oldal betölt, az önkéntesség státusza helyesen jelenik meg, a felvett feladatok láthatók. Bejelentkezés nélkül az oldal nem érhető el.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
