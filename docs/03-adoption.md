# 03 – Örökbefogadási kérelem teljes folyamat

## Összefoglalás

Ez a modul az örökbefogadási kérelem teljes életciklusát fedi le: a kérelem beküldésétől a menhely általi elbíráláson át a visszavonásig és az utánkövetési kérdőívig. A folyamat `PENDING → REVIEWING → APPROVED / REJECTED` státuszváltozásokat tartalmaz, és a kérelmek kezelhetők normál form kitöltéssel, meghívó link alapján, illetve jóváhagyás után utánkövetési kérdőívvel zárulnak.

---

## Felhasználói Történetek

- **US-03-A**: Mint bejelentkezett felhasználó, szeretnék örökbefogadási kérelmet beküldeni egy AVAILABLE státuszú állatnál, hogy elindíthassam az örökbefogadási folyamatot.
- **US-03-B**: Mint látogató, szeretnék bejelentkezésre irányítódni, ha kérelmet próbálok beküldeni, hogy tudjam, fiók szükséges a folyamathoz.
- **US-03-C**: Mint bejelentkezett felhasználó, szeretném nyomon követni a kérelmem státuszát, hogy tudjam, hol tart a folyamat.
- **US-03-D**: Mint menhely adminisztrátor, szeretném jóváhagyni a beérkező kérelmeket, hogy az örökbefogadás megtörténhessen.
- **US-03-E**: Mint menhely adminisztrátor, szeretném elutasítani a kérelmeket indoklással, hogy a kérelmezőt megfelelően tájékoztassam.
- **US-03-F**: Mint bejelentkezett felhasználó, szeretném visszavonni a PENDING állapotú kérelmemet, ha meggondoltam magam.
- **US-03-G**: Mint meghívott felhasználó, szeretnék meghívó link alapján kérelmet beküldeni, hogy a menhely által kezdeményezett folyamaton vehessek részt.
- **US-03-H**: Mint örökbefogadó, szeretnék utánkövetési kérdőívet kitölteni, hogy visszajelzést adjak az örökbefogadás sikerességéről.

---

## Tesztesetek

---

### TC-03-01: Kérelem beküldése AVAILABLE állatnál

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; seed adatbázisban legalább egy `AVAILABLE` státuszú állat létezik ismert slug-gal |
| **URL** | `/hu/animals/[slug]` → `/hu/animals/[slug]/apply` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állat részletes oldalán az „Örökbefogadás" gomb látható és aktív `AVAILABLE` állatnál
- [ ] A gombra kattintva az örökbefogadási form vagy modal megnyílik
- [ ] A form tartalmaz kötelező mezőket: motiváció/indoklás, lakáskörülmények, korábbi állattartási tapasztalat
- [ ] A kötelező mezők üresen hagyva a form nem küldhető el (validáció)
- [ ] Sikeres beküldés után a kérelem `PENDING` státusszal jön létre az adatbázisban
- [ ] A rendszer visszaigazoló üzenetet jelenít meg (toast vagy banner)
- [ ] A kérelem megjelenik a `/hu/applications` oldalon `PENDING` státusszal
- [ ] Ugyanarra az állatra ugyanaz a felhasználó nem küldhet be második kérelmet

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj egy `AVAILABLE` státuszú állat részletes oldalára (pl. `/hu/animals/bodri`).
3. Keresd meg az „Örökbefogadás" (vagy „Kérelem beküldése") gombot, és kattints rá.
4. Az örökbefogadási formon töltsd ki az összes kötelező mezőt:
   - Motiváció: „Szeretnék egy kedves kutyát örökbefogadni."
   - Lakáskörülmény: „Kertes ház, nagy udvar."
   - Tapasztalat: „5 éve tartok kutyát."
5. Kattints a „Beküldés" gombra.
6. Ellenőrizd a visszaigazoló üzenetet.
7. Navigálj a `/hu/applications` oldalra, és ellenőrizd, hogy a kérelem `PENDING` státusszal megjelenik.
8. Próbálj meg ugyanarra az állatra újabb kérelmet beküldeni – ellenőrizd, hogy a rendszer megakadályozza.

**Elvárt eredmény:**
A kérelem sikeresen beküldésre kerül, `PENDING` státusszal megjelenik az applications oldalon, visszaigazoló üzenet jelenik meg. Duplikált kérelem esetén a rendszer hibaüzenetet jelenít meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-02: Kérelem beküldése bejelentkezés nélkül → redirect login-ra

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A látogató nincs bejelentkezve; seed adatbázisban létezik `AVAILABLE` státuszú állat |
| **URL** | `/hu/animals/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A bejelentkezett felhasználóknak szánt „Örökbefogadás" gomb be nem jelentkezett állapotban is látható (vagy `callbackUrl`-lel irányít)
- [ ] A gombra kattintva a rendszer a `/hu/auth/login` oldalra irányít
- [ ] A bejelentkezési oldalon `callbackUrl` paraméterként meg van adva az állat URL-je
- [ ] Sikeres bejelentkezés után a rendszer visszairányít az állat részletes oldalára
- [ ] A közvetlen `/hu/animals/[slug]/apply` URL látogatása szintén loginra irányít

**Tesztelési lépések:**
1. Győződj meg róla, hogy nincsenek aktív bejelentkezési sütiket (InPrivate/Inkognito ablak).
2. Navigálj egy `AVAILABLE` állat részletes oldalára (pl. `/hu/animals/bodri`).
3. Kattints az „Örökbefogadás" gombra.
4. Ellenőrizd, hogy az URL `/hu/auth/login`-ra vált, és tartalmazza a `callbackUrl=/hu/animals/bodri` (vagy `/apply`) paramétert.
5. Jelentkezz be: `user@test.hu` / `User1234!`.
6. Ellenőrizd, hogy a rendszer visszairányít az állat oldalára (vagy az apply formra).
7. Próbálj közvetlenül navigálni a `/hu/animals/bodri/apply` URL-re bejelentkezés nélkül – ellenőrizd az átirányítást.

**Elvárt eredmény:**
Bejelentkezés nélkül az örökbefogadási gomb kattintása és a közvetlen URL-látogatás egyaránt a login oldalra irányít, és sikeres bejelentkezés után a folyamat folytatható.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-03: Kérelem státusz követése (PENDING → REVIEWING → APPROVED/REJECTED)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; legalább egy beküldött kérelem létezik `PENDING` státusszal |
| **URL** | `/hu/applications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/applications` oldal megjeleníti az összes saját kérelmet
- [ ] Minden kérelemnél látható az állat neve, a kérelem dátuma és az aktuális státusz
- [ ] A státusz vizuálisan jól megkülönböztethető (pl. eltérő színű badge-ek: sárga=PENDING, kék=REVIEWING, zöld=APPROVED, piros=REJECTED)
- [ ] PENDING státusz megjelenítése helyes
- [ ] REVIEWING státuszra váltás után az oldal frissítésekor az új státusz jelenik meg
- [ ] APPROVED állapotban a kérelem részletes oldala gratulációs üzenetet tartalmaz
- [ ] REJECTED állapotban az elutasítás indoklása megjelenik
- [ ] Bejelentkezés nélküli `/hu/applications` látogatás login oldalra irányít

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/applications` oldalra.
3. Ellenőrizd, hogy a kérelem `PENDING` státusszal jelenik meg.
4. (Szimulálj státuszváltást admin fiókkal – TC-03-04 alapján): Nyisd meg egy másik böngészőablakban a shelter admin dashboardot.
5. Az admin ablakban változtasd a kérelem státuszát `REVIEWING`-ra.
6. Töltsd újra a `/hu/applications` oldalt a felhasználói ablakban.
7. Ellenőrizd, hogy a státusz `REVIEWING`-ra változott.
8. Az admin ablakban változtasd `APPROVED`-ra, majd újra ellenőrizd a felhasználói oldalon.
9. Ismételd meg egy másik kérelemmel, és az adminnál változtasd `REJECTED`-re – ellenőrizd, hogy az indoklás megjelenik.

**Elvárt eredmény:**
A kérelmek oldalán minden státuszváltozás azonnal megjelenik a lap frissítése után. A különböző státuszok vizuálisan megkülönböztethetők, és az APPROVED/REJECTED állapotnál a részletező üzenet is megjelenik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-04: Menhely admin jóváhagyja a kérelmet

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett menhely adminisztrátor: `shelter@test.hu` / `Admin1234!`; legalább egy `PENDING` vagy `REVIEWING` státuszú kérelem létezik a menhelyhez |
| **URL** | `/hu/dashboard/applications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A shelter admin dashboard applications menüpontja tartalmazza az összes beérkező kérelmet
- [ ] Minden kérelemnél látható a kérelmező neve, az állat neve és a kérelem dátuma
- [ ] A kérelem részletes nézetében látható a kérelmező motivációja és adatai
- [ ] A „Jóváhagyás" (APPROVE) gomb elérhető és kattintható
- [ ] Jóváhagyás után a kérelem státusza `APPROVED`-ra változik
- [ ] Az érintett állat státusza automatikusan `ADOPTED`-ra változik (ha az üzleti logika ezt megköveteli)
- [ ] A kérelmező felhasználó értesítést kap (email vagy in-app notification)
- [ ] Az `APPROVED` kérelem nem jóváhagyható újra

**Tesztelési lépések:**
1. Jelentkezz be: `shelter@test.hu` / `Admin1234!`.
2. Navigálj a `/hu/dashboard/applications` oldalra.
3. Keresd meg a `PENDING` státuszú kérelmet.
4. Kattints a kérelem részletes megtekintésére (pl. „Megtekint" gomb).
5. Ellenőrizd, hogy a kérelmező adatai (motiváció, lakáskörülmény, tapasztalat) megjelennek.
6. Kattints a „Jóváhagyás" gombra.
7. Ellenőrizd a megerősítő dialógust/üzenetet, és erősítsd meg.
8. Ellenőrizd, hogy a kérelem státusza `APPROVED`-ra változik a listában.
9. Másik böngészőablakban (user@test.hu-ként) ellenőrizd, hogy a kérelem `APPROVED` státusszal jelenik meg a `/hu/applications` oldalon.
10. Ellenőrizd az érintett állat státuszát – amennyiben az üzleti logika megköveteli, `ADOPTED`-ra kell változnia.

**Elvárt eredmény:**
Az admin sikeresen jóváhagyja a kérelmet, a státusz `APPROVED`-ra változik, a felhasználói oldalon is frissül, és szükség esetén az állat státusza is automatikusan módosul.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-05: Menhely admin elutasítja a kérelmet (indoklással)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett menhely adminisztrátor: `shelter@test.hu` / `Admin1234!`; legalább egy `PENDING` vagy `REVIEWING` státuszú kérelem létezik |
| **URL** | `/hu/dashboard/applications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A kérelem részletes nézetében „Elutasítás" (REJECT) gomb elérhető
- [ ] Az elutasítási dialógus/form tartalmaz kötelező indoklás mezőt
- [ ] Üres indoklással az elutasítás nem véglegesíthető
- [ ] Indoklással ellátott elutasítás után a kérelem státusza `REJECTED`-re változik
- [ ] Az elutasítás indoklása megjelenik a kérelmező `/hu/applications` oldalán
- [ ] Az érintett állat státusza `AVAILABLE` marad (nem kerül `ADOPTED`-be)
- [ ] A kérelmező értesítést kap az elutasításról

**Tesztelési lépések:**
1. Jelentkezz be: `shelter@test.hu` / `Admin1234!`.
2. Navigálj a `/hu/dashboard/applications` oldalra.
3. Nyiss meg egy `PENDING` státuszú kérelmet.
4. Kattints az „Elutasítás" gombra.
5. Az elutasítási formon hagyd üresen az indoklás mezőt, és próbálj meg menteni – ellenőrizd a validációs hibaüzenetet.
6. Add meg az indoklást: „Sajnálattal értesítjük, hogy a lakáskörülmények nem megfelelőek."
7. Kattints a „Megerősítés" gombra.
8. Ellenőrizd, hogy a kérelem státusza `REJECTED`-re változik.
9. Másik böngészőablakban (user@test.hu-ként) navigálj a `/hu/applications` oldalra.
10. Ellenőrizd, hogy a kérelem `REJECTED` státusszal és az indoklás szövegével jelenik meg.
11. Ellenőrizd az állat oldalát – az állatnak `AVAILABLE` státuszban kell maradnia.

**Elvárt eredmény:**
Az admin elutasíthatja a kérelmet kötelező indoklással. Az elutasítás indoklása a felhasználói oldalon megjelenik, az állat `AVAILABLE` marad, üres indoklással az elutasítás nem lehetséges.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-06: Kérelem visszavonása PENDING állapotban (user oldal)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; legalább egy `PENDING` státuszú kérelem létezik |
| **URL** | `/hu/applications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `PENDING` státuszú kérelemnél „Visszavonás" gomb jelenik meg
- [ ] A visszavonás megerősítő dialógust vált ki
- [ ] Visszavonás után a kérelem törlődik vagy `CANCELLED` státuszra vált
- [ ] Az érintett állatra újra lehetséges kérelmet beküldeni visszavonás után
- [ ] Az `APPROVED` vagy `REJECTED` státuszú kérelem nem vonható vissza
- [ ] `REVIEWING` státuszú kérelem visszavonhatóságát az üzleti logika határozza meg (ellenőrizd a dokumentációt)

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/applications` oldalra.
3. Keresd meg a `PENDING` státuszú kérelmet.
4. Kattints a „Visszavonás" gombra.
5. A megerősítő dialógusban kattints a „Mégse" gombra – ellenőrizd, hogy a kérelem megmarad.
6. Kattints újra a „Visszavonás" gombra, majd erősítsd meg.
7. Ellenőrizd, hogy a kérelem eltűnik vagy `CANCELLED` státuszra vált a listából.
8. Navigálj az érintett állat oldalára, és próbálj új kérelmet beküldeni – ennek sikeresnek kell lennie.
9. Ellenőrizd, hogy `APPROVED` státuszú kérelem esetén nincs visszavonás gomb (ha van ilyen kérelem a seed adatokban).

**Elvárt eredmény:**
A `PENDING` kérelem visszavonható megerősítés után. Visszavonás után az állatra újabb kérelem küldhető. Végleges státuszú (APPROVED/REJECTED) kérelem nem vonható vissza.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-07: Meghívó link alapján kérelem benyújtása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Menhely admin (`shelter@test.hu` / `Admin1234!`) által generált érvényes meghívó token létezik; a meghívott user be van jelentkezve (`user@test.hu` / `User1234!`) |
| **URL** | `/hu/apply/[token]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Érvényes token esetén a meghívó link az örökbefogadási formra visz, és az állat adatai előre kitöltve jelennek meg
- [ ] A form kitölthető és beküldhető a meghívó alapján
- [ ] Lejárt token esetén hibaüzenet jelenik meg: „Ez a meghívó link már nem érvényes"
- [ ] Érvénytelen / nem létező token esetén 404-es oldal vagy hibaüzenet jelenik meg
- [ ] Már felhasznált token esetén hibaüzenet jelenik meg
- [ ] Bejelentkezés nélküli meghívó link látogatásakor loginra irányít, majd visszairányít a `/apply/[token]` URL-re
- [ ] Sikeres beküldés után a kérelem `PENDING` státusszal jön létre

**Tesztelési lépések:**
1. Jelentkezz be shelter adminként (`shelter@test.hu` / `Admin1234!`), és generálj meghívó linket egy `AVAILABLE` állathoz (dashboard → állat oldal → meghívó küldés).
2. Másold ki a generált meghívó linket (formátum: `/hu/apply/[token]`).
3. Nyiss egy inkognito ablakot (bejelentkezés nélkül), és navigálj a meghívó linkre.
4. Ellenőrizd, hogy login oldalra irányít, majd bejelentkezés után visszakerülsz a `/apply/[token]` oldalra.
5. Töltsd ki a form kötelező mezőit, és küldd be a kérelmet.
6. Ellenőrizd a visszaigazoló üzenetet és a kérelem megjelenését a `/hu/applications` oldalon.
7. Próbáld meg ugyanazt a tokent másodszor is felhasználni – ellenőrizd a hibaüzenetet.
8. Navigálj a `/hu/apply/nemletezoken12345` URL-re – ellenőrizd a hibaüzenetet/404-es oldalt.

**Elvárt eredmény:**
Érvényes meghívó tokennel a form kitölthető és beküldhető. Lejárt, használt vagy érvénytelen token esetén megfelelő hibaüzenet jelenik meg. Bejelentkezés szükséges a folyamathoz.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-03-08: Utánkövetési kérdőív kitöltése (30 napos, /followups)

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; az adatbázisban létezik `APPROVED` státuszú kérelem, amelyhez 30 napja (vagy a tesztben szimulált időpontban) utánkövetési kérdőív vár kitöltésre |
| **URL** | `/hu/followups` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/followups` oldal megjeleníti a kitöltésre váró kérdőíveket
- [ ] A kérdőív tartalmaz releváns kérdéseket (pl. az állat beilleszkedése, egészségi állapota, elégedettség a menhellyel)
- [ ] Minden kötelező kérdés megválaszolása nélkül a form nem küldhető el
- [ ] Sikeres kitöltés után a kérdőív `COMPLETED` státuszra vált
- [ ] A kitöltött kérdőív már nem szerkeszthető
- [ ] A menhely admin a dashboardon látja a beérkező utánkövetési válaszokat
- [ ] Bejelentkezés nélküli `/hu/followups` látogatás login oldalra irányít

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/followups` oldalra.
3. Ellenőrizd, hogy a kitöltésre váró kérdőívek megjelennek (szükség esetén a seed adatok alapján).
4. Kattints a kérdőív kitöltése gombra.
5. Próbálj meg kitöltetlen kérdéssel beküldeni – ellenőrizd a validációt.
6. Töltsd ki az összes kötelező mezőt (pl. értékelj 1–5-ig, adj szöveges visszajelzést).
7. Kattints a „Beküldés" gombra.
8. Ellenőrizd, hogy a kérdőív `COMPLETED` státuszra vált, és már nem szerkeszthető.
9. Jelentkezz be shelter adminként (`shelter@test.hu` / `Admin1234!`), és navigálj a dashboard followups szekciójába.
10. Ellenőrizd, hogy a beküldött válaszok megjelennek.

**Elvárt eredmény:**
A 30 napos utánkövetési kérdőív elérhető a `/hu/followups` oldalon, kitölthető, és sikeres beküldés után `COMPLETED` státuszra vált. Az admin oldalon a válaszok megjelennek. Üres kötelező mezőkkel a form nem küldhető el.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
