# 05 – Időpontfoglalás

## Összefoglalás

Ez a modul az állatlátogatáshoz kapcsolódó időpontfoglalási rendszert fedi le. A felhasználók a menhely vagy az állat oldaláról indíthatják az időpontfoglalást, a menhely adminisztrátor visszaigazolhatja vagy lemondhatja az időpontokat, a felhasználók szintén lemondhatják a már visszaigazolt időpontjaikat, és a visszaigazoláskor értesítés érkezik.

---

## Felhasználói Történetek

- **US-05-A**: Mint bejelentkezett felhasználó, szeretnék időpontot foglalni egy állat meglátogatásához, hogy személyesen megismerhessem az örökbefogadni kívánt állatot.
- **US-05-B**: Mint bejelentkezett felhasználó, szeretném látni az összes foglalt időpontomat és azok státuszát, hogy nyomon kövessem a látogatásaimat.
- **US-05-C**: Mint menhely adminisztrátor, szeretném visszaigazolni a beérkező időpont-kéréseket, hogy a látogatók tudják, mikor jöhetnek.
- **US-05-D**: Mint menhely adminisztrátor, szeretném lemondani egy időpontot indoklással, ha az adott időpont nem megfelelő.
- **US-05-E**: Mint bejelentkezett felhasználó, szeretném lemondani egy visszaigazolt időpontomat, ha nem tudok menni.
- **US-05-F**: Mint bejelentkezett felhasználó, szeretnék értesítést kapni az időpont visszaigazolásakor, hogy ne maradjak le az időpontomról.

---

## Tesztesetek

---

### TC-05-01: Időpontfoglalási kérés küldése menhely/állat oldaláról

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; seed adatbázisban legalább egy `AVAILABLE` státuszú állat és hozzá tartozó menhely létezik |
| **URL** | `/hu/animals/[slug]` → időpontfoglaló form/modal |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állat részletes oldalán „Időpontot foglalok" (vagy hasonló) gomb megjelenik
- [ ] A gombra kattintva megnyílik az időpontfoglaló form vagy modal
- [ ] A form kötelező mezőket tartalmaz: kívánt dátum/időpont, esetleges megjegyzés
- [ ] A dátumválasztó csak jövőbeli dátumokat enged kiválasztani
- [ ] Kötelező mező üresen hagyva a form nem küldhető el
- [ ] Sikeres beküldés után az időpont `PENDING` státusszal jön létre
- [ ] Visszaigazoló üzenet (toast/banner) jelenik meg a sikeres foglalásról
- [ ] Bejelentkezés nélküli kattintás login oldalra irányít
- [ ] A foglalás megjelenik a `/hu/appointments` oldalon `PENDING` státusszal

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj egy `AVAILABLE` állat részletes oldalára (pl. `/hu/animals/bodri`).
3. Kattints az „Időpontot foglalok" gombra.
4. Az időpontfoglaló formon próbálj meg múltbeli dátumot kiválasztani – ellenőrizd, hogy le van tiltva.
5. Válassz ki egy jövőbeli dátumot és időpontot (pl. holnap 14:00).
6. Adj meg megjegyzést: „Szerdán délután tudnék jönni, várom visszaigazolást."
7. Kattints a „Foglalás" gombra.
8. Ellenőrizd a visszaigazoló üzenetet.
9. Navigálj a `/hu/appointments` oldalra, és ellenőrizd, hogy az időpont `PENDING` státusszal megjelenik.
10. Kijelentkezés után navigálj az állat oldalára, és kattints az időpontfoglaló gombra – ellenőrizd a login átirányítást.

**Elvárt eredmény:**
Az időpontfoglaló form sikeresen működik, a foglalás `PENDING` státusszal jön létre, visszaigazoló üzenet jelenik meg, és a foglalás megjelenik a felhasználói appointments oldalon. Bejelentkezés nélkül login oldalra irányít.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-05-02: Időpontok listája user oldalon

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; legalább egy foglalt időpont létezik a seed adatokban (különböző státuszokkal: PENDING, CONFIRMED, COMPLETED, CANCELLED) |
| **URL** | `/hu/appointments` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/appointments` oldal megjeleníti az összes saját időpontot
- [ ] Minden időpontnál látható: az állat neve, a menhely neve, a kért dátum/időpont, és az aktuális státusz
- [ ] A státuszok vizuálisan megkülönböztethetők (pl. eltérő színű badge-ek: sárga=PENDING, kék=CONFIRMED, zöld=COMPLETED, szürke=CANCELLED)
- [ ] Az időpontok szűrhetők státusz szerint (ha az UI támogatja)
- [ ] A CONFIRMED időpontnál elérhető a lemondás gomb
- [ ] A COMPLETED és CANCELLED időpontoknál nincs módosítási lehetőség
- [ ] Ha nincs időpont, az oldal „nincs foglalt időpont" üzenetet jelenít meg
- [ ] Bejelentkezés nélküli `/hu/appointments` látogatás login oldalra irányít

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/appointments` oldalra.
3. Ellenőrizd, hogy az összes időpont megjelenik a listában.
4. Keresd meg a különböző státuszú időpontokat (PENDING, CONFIRMED, COMPLETED, CANCELLED).
5. Ellenőrizd minden tételnél az állat nevét, menhely nevét, dátumot és státusz badge-t.
6. Ellenőrizd, hogy a CONFIRMED státuszú időpontnál megjelenik a „Lemondás" gomb.
7. Ellenőrizd, hogy a COMPLETED és CANCELLED tételeknél nincs módosítási gomb.
8. Ha van szűrési lehetőség, szűrj CONFIRMED-re – ellenőrizd a szűrt listát.
9. Kijelentkezés után navigálj közvetlenül a `/hu/appointments` URL-re – ellenőrizd a login átirányítást.

**Elvárt eredmény:**
Az appointments oldal helyesen megjeleníti az összes saját időpontot az összes státusszal, a státuszok vizuálisan megkülönböztethetők, a megfelelő action gombok jelennek meg, és bejelentkezés védi az oldalt.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-05-03: Admin visszaigazolja az időpontot

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett menhely adminisztrátor: `shelter@test.hu` / `Admin1234!`; legalább egy `PENDING` státuszú időpont-kérés létezik a menhelyhez |
| **URL** | `/hu/dashboard/appointments` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A shelter admin dashboard appointments szekciója megjeleníti az összes beérkező időpont-kérést
- [ ] Minden kérésnél látható: a kérelmező neve, az állat neve, a kért dátum és az aktuális státusz
- [ ] A `PENDING` időpontnál elérhető a „Visszaigazolás" (CONFIRM) gomb
- [ ] Visszaigazolás után az időpont státusza `CONFIRMED`-re változik
- [ ] A visszaigazoláshoz opcionálisan megadható alternatív időpont (ha az UI támogatja)
- [ ] A visszaigazolás után a felhasználói oldalon is `CONFIRMED` státusz jelenik meg
- [ ] Az admin nem igazolhat vissza már `CONFIRMED`, `COMPLETED` vagy `CANCELLED` státuszú időpontot

**Tesztelési lépések:**
1. Jelentkezz be: `shelter@test.hu` / `Admin1234!`.
2. Navigálj a `/hu/dashboard/appointments` oldalra.
3. Keresd meg a `PENDING` státuszú időpont-kérést.
4. Ellenőrizd a kérés részleteit: kérelmező neve, állat neve, kért dátum/időpont.
5. Kattints a „Visszaigazolás" gombra.
6. Ha van megerősítési dialógus, erősítsd meg.
7. Ellenőrizd, hogy az időpont státusza `CONFIRMED`-re változott a listában.
8. Nyiss egy másik böngészőablakot, és jelentkezz be `user@test.hu` / `User1234!`-ként.
9. Navigálj a `/hu/appointments` oldalra, és ellenőrizd, hogy az időpont `CONFIRMED` státusszal jelenik meg.

**Elvárt eredmény:**
Az admin sikeresen visszaigazolja az időpontot, a státusz `CONFIRMED`-re változik, és a változás a felhasználói oldalon is azonnal megjelenik a lap frissítése után.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-05-04: Admin lemondja az időpontot indoklással

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett menhely adminisztrátor: `shelter@test.hu` / `Admin1234!`; legalább egy `PENDING` vagy `CONFIRMED` státuszú időpont létezik |
| **URL** | `/hu/dashboard/appointments` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `PENDING` és `CONFIRMED` időpontoknál elérhető a „Lemondás" (CANCEL) gomb
- [ ] A lemondási dialógus/form tartalmaz indoklás mezőt
- [ ] Üres indoklással a lemondás nem véglegesíthető (ha kötelező)
- [ ] Sikeres lemondás után az időpont státusza `CANCELLED`-re változik
- [ ] A lemondás indoklása megjelenik a felhasználói appointments oldalon
- [ ] A lemondott időpontnál az érintett állat továbbra is `AVAILABLE` marad

**Tesztelési lépések:**
1. Jelentkezz be: `shelter@test.hu` / `Admin1234!`.
2. Navigálj a `/hu/dashboard/appointments` oldalra.
3. Keresd meg a `PENDING` vagy `CONFIRMED` státuszú időpontot.
4. Kattints a „Lemondás" gombra.
5. Ha az indoklás kötelező, próbálj meg üres indoklással menteni – ellenőrizd a validációt.
6. Add meg az indoklást: „Sajnálattal értesítjük, hogy az adott időpont mégsem megfelelő. Kérjük, foglaljon új időpontot."
7. Kattints a „Megerősítés" gombra.
8. Ellenőrizd, hogy az időpont státusza `CANCELLED`-re változott.
9. Másik böngészőablakban (user@test.hu-ként) navigálj a `/hu/appointments` oldalra.
10. Ellenőrizd, hogy a lemondott időpont `CANCELLED` státusszal és az indoklással jelenik meg.
11. Ellenőrizd az érintett állat oldalát – az állatnak `AVAILABLE` státuszban kell maradnia.

**Elvárt eredmény:**
Az admin kötelező indoklással mondja le az időpontot, a státusz `CANCELLED`-re változik, az indoklás a felhasználói oldalon megjelenik, és az állat `AVAILABLE` marad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-05-05: User lemondja a visszaigazolt időpontot

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; legalább egy `CONFIRMED` státuszú időpont létezik a felhasználóhoz |
| **URL** | `/hu/appointments` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `CONFIRMED` státuszú időpontnál „Lemondás" gomb jelenik meg
- [ ] A lemondás megerősítő dialógust vált ki
- [ ] Megerősítés után az időpont státusza `CANCELLED`-re változik
- [ ] A lemondott időpont eltűnik az aktív foglalások listájából (vagy `CANCELLED` jelzéssel megmarad az előzményekben)
- [ ] A `PENDING` státuszú időpontnál szintén elérhető a lemondás (ha az üzleti logika engedi)
- [ ] A `COMPLETED` időpont nem mondható le

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/appointments` oldalra.
3. Keresd meg a `CONFIRMED` státuszú időpontot.
4. Kattints a „Lemondás" gombra.
5. A megerősítési dialógusban kattints a „Mégse" gombra – ellenőrizd, hogy az időpont megmarad.
6. Kattints újra a „Lemondás" gombra, és erősítsd meg.
7. Ellenőrizd, hogy az időpont státusza `CANCELLED`-re változott.
8. Ellenőrizd, hogy a `COMPLETED` státuszú időpontnál (ha van) nincs lemondás gomb.
9. A menhely admin dashboardon (shelter@test.hu) ellenőrizd, hogy a lemondás megjelenik.

**Elvárt eredmény:**
A felhasználó sikeresen lemondja a `CONFIRMED` időpontját, a státusz `CANCELLED`-re változik, és a változás az admin oldalon is megjelenik. Megerősítési dialógus védi a véletlen lemondást.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-05-06: Értesítés megérkezése visszaigazoláskor

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; a felhasználónak van `PENDING` időpontja; `shelter@test.hu` admin-fiók elérhető |
| **URL** | `/hu/appointments`, fejléc értesítési ikon |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az időpont visszaigazolásakor a felhasználó in-app értesítést kap
- [ ] Az értesítés megjelenik a fejléc értesítési ikonján (pl. piros badge számmal)
- [ ] Az értesítési panelen megjelenik az üzenet: „Az időpontod visszaigazolva: [dátum]"
- [ ] Az értesítésre kattintva az appointments oldalra irányít
- [ ] Az értesítés e-mailben is megérkezik (ha az e-mail értesítés be van állítva)
- [ ] Az értesítés olvasottnak jelölhető, és az olvasás után a badge számlálója csökken

**Tesztelési lépések:**
1. Nyiss két böngészőablakot egymás mellett.
2. Az első ablakban jelentkezz be: `user@test.hu` / `User1234!`, navigálj a `/hu/appointments` oldalra.
3. A második ablakban jelentkezz be: `shelter@test.hu` / `Admin1234!`, navigálj a `/hu/dashboard/appointments` oldalra.
4. A második (admin) ablakban igazolj vissza egy `PENDING` időpontot.
5. Térj vissza az első (user) ablakra.
6. Ellenőrizd, hogy a fejlécben megjelenik az értesítési badge (esetleg automatikusan, 30 másodpercen belül, ha polling van).
7. Töltsd újra az oldalt (F5), ha szükséges – ellenőrizd az értesítési ikont.
8. Kattints az értesítési ikonra, és ellenőrizd az értesítési panel tartalmát.
9. Kattints az értesítésre – ellenőrizd, hogy az `/hu/appointments` oldalra irányít.
10. Ellenőrizd, hogy az értesítés olvasottnak van jelölve, és a badge számlálója csökkent.

**Elvárt eredmény:**
Az időpont visszaigazolásakor a felhasználó in-app értesítést kap, amely a fejlécben jelenik meg. Az értesítési panel tartalmazza az időpont adatait, az értesítés olvasottnak jelölhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
