# 14 – Örökbefogadás utáni utánkövetés

## Összefoglalás

Ez a modul fedi le az örökbefogadás utáni utánkövetési (follow-up) folyamatot. Amikor egy örökbefogadási kérelem `APPROVED` státuszra vált, a rendszer automatikusan három utánkövetési időpontot ütemez (1 hét, 1 hónap, 3 hónap), és `FOLLOW_UP_DUE` értesítést küld az örökbefogadónak. A felhasználó a `/hu/followups` oldalon a `FollowUpCard` komponensen keresztül adhat visszajelzést: 1–5 csillagos jóléti értékelést (`wellbeing`), opcionális megjegyzést (`notes`, max. 2000 karakter). Beküldéskor a menhely adminjai `FOLLOW_UP_RECEIVED` értesítést kapnak. Az utánkövetés státuszai (`FollowUpStatus`): `PENDING` (esedékes), `COMPLETED` (kitöltött), `OVERDUE` (lejárt – a határidő túllépésekor automatikusan beáll). Az admin a `/dashboard/followups` oldalon KPI-kkal és táblázattal tekintheti át a menhelyéhez tartozó utánköveteket.

---

## Felhasználói Történetek

- **US-14-A**: Mint menhelyi admin, szeretném, ha a jóváhagyott örökbefogadások után automatikusan utánkövetési ütemterv jönne létre, hogy ne kelljen kézzel nyomon követnem az állatok sorsát.
- **US-14-B**: Mint örökbefogadó, szeretném egy helyen látni az esedékes, lejárt és kitöltött utánkövetéseimet, hogy tudjam, mikor kell visszajelzést adnom.
- **US-14-C**: Mint örökbefogadó, szeretnék csillagos értékeléssel és megjegyzéssel visszajelzést küldeni az állat jólétéről, hogy a menhely lássa, jó helyre került.
- **US-14-D**: Mint menhelyi admin, szeretnék értesítést kapni, amikor visszajelzés érkezik, hogy időben reagálhassak az esetleges problémákra.
- **US-14-E**: Mint menhelyi admin, szeretném táblázatban és statisztikákkal áttekinteni az utánkövetéseket (átlagos elégedettség, lejárt visszajelzések), hogy átlássam az örökbefogadások utóéletét.

---

## Tesztesetek

---

### TC-14-01: Utánkövetési ütemterv automatikus létrehozása jóváhagyáskor

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu`-nak van `PENDING` vagy `REVIEWING` státuszú örökbefogadási kérelme; `shelter@test.hu` az érintett menhely adminja |
| **URL** | `/dashboard/applications` (admin) → `/hu/followups` (felhasználó) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Amikor az admin a kérelmet `APPROVED` státuszra állítja, automatikusan 3 `AdoptionFollowUp` rekord jön létre
- [ ] Az ütemezett időpontok: jóváhagyástól számított 7, 30 és 90 nap (`scheduledAt`)
- [ ] Mindhárom rekord `PENDING` státusszal jön létre, a kérelemhez (`applicationId`) kapcsolva
- [ ] A felhasználó `FOLLOW_UP_DUE` típusú értesítést kap („Utánkövetés ütemezve"), amely a `/followups` oldalra mutat
- [ ] Az értesítés szövege tartalmazza az állat nevét és az ütemezést (1 hét, 1 hónap, 3 hónap)
- [ ] A felhasználó `/hu/followups` oldalán megjelenik a 3 új, „Esedékes" tétel

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal és navigálj a `/dashboard/applications` oldalra.
2. Keresd meg a `user@test.hu` felhasználó folyamatban lévő kérelmét.
3. Állítsd a kérelem státuszát `APPROVED`-ra.
4. Jelentkezz be másik böngészőben/lapon `user@test.hu` / `User1234!` fiókkal.
5. Ellenőrizd a fejléc csengőjében az „Utánkövetés ütemezve" értesítést, és hogy az állat neve szerepel benne.
6. Kattints az értesítésre – ellenőrizd, hogy a `/hu/followups` oldalra navigál.
7. Ellenőrizd, hogy 3 új utánkövetési kártya jelent meg „Esedékes" státusszal, az érintett állat nevével és fotójával.
8. Ellenőrizd a kártyákon a határidő dátumokat (kb. +7, +30 és +90 nap a mai naptól).

**Elvárt eredmény:**
A kérelem jóváhagyásakor automatikusan létrejön a 3 elemű utánkövetési ütemterv (7/30/90 nap, `PENDING` státusz), a felhasználó értesítést kap, és a `/hu/followups` oldalon megjelennek az esedékes tételek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-14-02: Felhasználói utánkövetési oldal megtekintése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve; a felhasználóhoz tartozik legalább egy utánkövetés (seed vagy TC-14-01) |
| **URL** | `/hu/followups` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Kijelentkezve az oldal a bejelentkezésre irányít át (`/auth/login?callbackUrl=/followups`)
- [ ] Az oldal címe „Utánkövetés", alcíme „Az örökbefogadás utáni visszajelzések"
- [ ] Felül 3 statisztikai kártya jelenik meg: „Teljesített" (zöld), „Esedékes" (kék), „Lejárt" (piros) – helyes darabszámokkal
- [ ] A tételek szekciókba rendezve jelennek meg: először „Lejárt", majd „Esedékes", végül „Kitöltött"
- [ ] Minden `FollowUpCard` kártyán megjelenik: állat fotója, neve, menhely neve, határidő dátuma, státusz badge („Esedékes" / „Késésben" / „Kitöltve")
- [ ] Ha nincs utánkövetés, üres állapot jelenik meg („Nincs utánkövetési feladatod")
- [ ] A tételek határidő szerint növekvő sorrendben listázódnak

**Tesztelési lépések:**
1. Kijelentkezett állapotban nyisd meg a `/hu/followups` URL-t – ellenőrizd az átirányítást.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/followups` oldalra.
3. Ellenőrizd a 3 statisztikai kártyát és hogy a számok megegyeznek a listában látható tételekkel.
4. Ellenőrizd a szekciók sorrendjét: Lejárt → Esedékes → Kitöltött (üres szekció nem jelenik meg).
5. Ellenőrizd egy kártyán az állat fotóját, nevét, a menhely nevét és a határidőt (magyar dátumformátum).
6. Ellenőrizd a státusz badge-eket és színeket (kék = Esedékes, piros = Késésben, zöld = Kitöltve).
7. (Üres állapot) Jelentkezz be utánkövetés nélküli fiókkal – ellenőrizd az üres állapot szöveget.

**Elvárt eredmény:**
Az oldal csak bejelentkezve érhető el, a statisztikák és a szekciókba rendezett kártyák helyesen jelennek meg, a státuszok vizuálisan megkülönböztetettek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-14-03: Visszajelzés beküldése (csillagos értékelés + megjegyzés)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve; van legalább egy `PENDING` vagy `OVERDUE` utánkövetése |
| **URL** | `/hu/followups` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A nem kitöltött kártya lenyitható (chevron gomb), és megjelenik a beküldő űrlap
- [ ] Az űrlapon 1–5 csillagos értékelés adható („Hogyan érzi magát [állatnév]?"); a kiválasztott értékhez szöveges címke tartozik (pl. 5 = „Kiváló!")
- [ ] Értékelés nélkül a beküldés hibaüzenetet ad („Kérjük adj értékelést!")
- [ ] A megjegyzés mező opcionális, max. 2000 karakter
- [ ] Beküldéskor `PATCH /api/followups/[id]` hívás történik; a rekord `COMPLETED` státuszra vált, `completedAt`, `wellbeing` és `notes` mezőkkel
- [ ] A kártya azonnal „Kitöltve" állapotra vált, és megjeleníti a csillagokat és a megjegyzést
- [ ] A menhely adminjai `FOLLOW_UP_RECEIVED` típusú értesítést kapnak („Utánkövetési visszajelzés érkezett"), amely a `/dashboard/followups` oldalra mutat és tartalmazza az állat nevét és az értékelést (pl. „4/5")

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/followups` oldalra.
2. Nyiss le egy „Esedékes" kártyát a chevron gombbal.
3. (Negatív eset) Kattints a „Visszajelzés küldése" gombra értékelés nélkül – ellenőrizd a hibaüzenetet.
4. Kattints a 4. csillagra – ellenőrizd, hogy 4 csillag kitöltött és megjelenik a „Nagyon jól" címke.
5. Írj megjegyzést: „Nagyon jól beilleszkedett, sokat játszik."
6. Kattints a „Visszajelzés küldése" gombra.
7. Ellenőrizd, hogy a kártya „Kitöltve" státuszra váltott, és mutatja a 4/5 csillagot és a megjegyzést.
8. Ellenőrizd, hogy a statisztikákban a „Teljesített" száma nőtt, az „Esedékes" csökkent.
9. Jelentkezz be `shelter@test.hu` fiókkal – ellenőrizd az „Utánkövetési visszajelzés érkezett" értesítést a csengőben, és hogy a `/dashboard/followups` oldalra visz.

**Elvárt eredmény:**
A visszajelzés a csillagos értékeléssel és megjegyzéssel sikeresen beküldhető, a tétel `COMPLETED` státuszra vált, a menhelyi admin értesítést kap az értékeléssel.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-14-04: Ismételt kitöltés és jogosulatlan hozzáférés tiltása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Létezik egy `COMPLETED` utánkövetés `user@test.hu`-nál (TC-14-03); létezik másik felhasználói fiók |
| **URL** | `/hu/followups`, `PATCH /api/followups/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Kitöltve" státuszú kártyán nem jelenik meg a lenyitó (chevron) gomb, az űrlap nem érhető el
- [ ] A kitöltött kártya csak olvasható nézetben mutatja az értékelést (csillagok) és a megjegyzést
- [ ] `COMPLETED` utánkövetésre küldött `PATCH /api/followups/[id]` kérés 409-es hibát ad („Már kitöltve")
- [ ] Más felhasználó utánkövetésére küldött `PATCH` kérés 403-as hibát ad („Nincs jogosultságod")
- [ ] Bejelentkezés nélküli `PATCH` kérés 401-es hibát ad
- [ ] Nem létező azonosítóval a kérés 404-es hibát ad („Nem található")
- [ ] Érvénytelen adat (pl. `wellbeing: 6` vagy `wellbeing: 0`) 400-as hibát ad („Érvénytelen adatok")

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/followups` oldalra.
2. Keress egy „Kitöltve" kártyát – ellenőrizd, hogy nincs rajta lenyitó gomb, csak az értékelés olvasható.
3. (API) Küldj `PATCH /api/followups/[id]` kérést a kitöltött tétel azonosítójával (`{"wellbeing": 5}`) – ellenőrizd a 409-es választ.
4. (API) Küldj `PATCH` kérést `wellbeing: 6` értékkel egy nyitott tételre – ellenőrizd a 400-as választ.
5. (API) Jelentkezz be egy másik felhasználói fiókkal és küldj `PATCH` kérést a `user@test.hu` egyik utánkövetésére – ellenőrizd a 403-as választ.
6. (API) Kijelentkezve küldj `PATCH` kérést – ellenőrizd a 401-es választ.
7. (API) Küldj kérést nem létező azonosítóval – ellenőrizd a 404-es választ.

**Elvárt eredmény:**
A kitöltött utánkövetés nem módosítható (409), idegen felhasználó tételéhez nincs hozzáférés (403), a validáció (1–5 közötti `wellbeing`) és az autentikáció kikényszerített.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-14-05: Lejárt (OVERDUE) státusz automatikus beállítása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Adatbázis-hozzáférés: létezik (vagy létrehozható) egy `PENDING` utánkövetés múltbeli `scheduledAt` dátummal |
| **URL** | `/hu/followups`, `/dashboard/followups` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `GET /api/followups` (felhasználói oldal betöltése) a lekérés előtt minden `PENDING` státuszú, múltbeli `scheduledAt` dátumú tételt `OVERDUE`-ra állít
- [ ] Ugyanez a logika a `/dashboard/followups` admin oldal betöltésekor is lefut (a menhelyre szűrve)
- [ ] A lejárt tétel a felhasználói oldalon a „Lejárt" szekcióban, piros szegélyű kártyán, „Késésben" badge-dzsel jelenik meg
- [ ] A „Lejárt" szekció a lista tetején, az esedékesek előtt jelenik meg
- [ ] A lejárt tétel továbbra is kitölthető (a beküldő űrlap elérhető), beküldés után `COMPLETED`-re vált
- [ ] A statisztikákban a „Lejárt" számláló helyes értéket mutat

**Tesztelési lépések:**
1. Állíts be (adatbázisban vagy seed segítségével) egy `PENDING` utánkövetést múltbeli `scheduledAt` dátummal a `user@test.hu` felhasználóhoz.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és nyisd meg a `/hu/followups` oldalt.
3. Ellenőrizd, hogy a tétel a „Lejárt" szekcióban jelenik meg, piros kerettel és „Késésben" badge-dzsel.
4. Ellenőrizd az adatbázisban, hogy a rekord státusza `OVERDUE`-ra változott.
5. Ellenőrizd, hogy a „Lejárt" statisztikai kártya számlálója nőtt.
6. Nyisd le a lejárt kártyát és küldj be visszajelzést (3 csillag) – ellenőrizd, hogy „Kitöltve" státuszra vált.
7. Jelentkezz be `shelter@test.hu` fiókkal és nyisd meg a `/dashboard/followups` oldalt – ellenőrizd, hogy az ott lévő lejárt tételek is „Lejárt" címkével jelennek meg.

**Elvárt eredmény:**
A határidőn túli `PENDING` tételek az oldalbetöltéskor automatikusan `OVERDUE` státuszra váltanak, vizuálisan kiemelve jelennek meg, és továbbra is kitölthetők.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-14-06: Admin utánkövetési áttekintő oldal

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; a menhelyhez tartozik legalább egy kitöltött és egy nyitott utánkövetés |
| **URL** | `/dashboard/followups` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal csak bejelentkezve érhető el; menhelyhez nem rendelt felhasználót a `/dashboard` oldalra irányít át
- [ ] A KPI sáv 4 kártyát mutat: „Összes", „Teljesített", „Esedékes", „Lejárt" – helyes darabszámokkal
- [ ] Ha van értékelt tétel, megjelenik az „Átlagos elégedettség: X/5" sáv (egy tizedesjegyre kerekítve)
- [ ] A táblázat oszlopai: Állat, Örökbefogadó (név + e-mail), Határidő, Státusz, Értékelés, Megjegyzés
- [ ] A státusz badge-ek: „Kitöltve" (zöld), „Esedékes" (kék), „Lejárt" (piros)
- [ ] Az értékelés 1–5 csillaggal jelenik meg (`WellbeingStars`), értékelés nélkül „—"
- [ ] `SHELTER_ADMIN` csak a saját menhelye utánkövetéseit látja; `SUPER_ADMIN` (`admin@test.hu`) az összeset
- [ ] Üres lista esetén üres állapot jelenik meg („Még nincs utánkövetési adat")

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal és navigálj a `/dashboard/followups` oldalra.
2. Ellenőrizd a 4 KPI kártya értékeit, és vesd össze a táblázat sorainak számával.
3. Ellenőrizd az „Átlagos elégedettség" sávot – számold ki kézzel az értékelt tételek átlagát és hasonlítsd össze.
4. Ellenőrizd a táblázat oszlopait és egy kitöltött sorban: állat neve, örökbefogadó neve és e-mailje, határidő, zöld „Kitöltve" badge, csillagok, megjegyzés.
5. Ellenőrizd, hogy egy nyitott (nem kitöltött) sorban az értékelés helyén „—" áll.
6. Ellenőrizd, hogy csak a saját menhely állataihoz tartozó tételek jelennek meg.
7. Jelentkezz be `admin@test.hu` / `Admin1234!` fiókkal – ellenőrizd, hogy az összes menhely utánkövetései megjelennek.
8. Jelentkezz be `user@test.hu` fiókkal és próbáld megnyitni a `/dashboard/followups` oldalt – ellenőrizd az átirányítást.

**Elvárt eredmény:**
Az admin oldal helyes KPI-kat, átlagos elégedettséget és teljes táblázatot mutat. A jogosultsági szűrés működik: menhelyi admin csak a sajátját, szuperadmin mindent lát, sima felhasználó nem fér hozzá.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
