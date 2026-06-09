# 09 – Bejelentések, interaktív térkép

## Összefoglalás

Ez a modul fedi le az elveszett, talált és kóborló állatok bejelentési rendszerét, valamint az interaktív Leaflet alapú térképet. A felhasználók bejelentéseket hozhatnak létre helyszínmegjelöléssel, fotóval és elérhetőségi adatokkal. A bejelentések listája típus és státusz szerint szűrhető. A bejelentő saját bejelentéseit lezárhatja (`RESOLVED` státuszra állíthatja). A térkép megjeleníti a bejelentéseket és a menhelyeket markerekkel, mobilon oldalsó panel nyitható a szűréshez.

---

## Felhasználói Történetek

- **US-09-A**: Mint bejelentkezett felhasználó, szeretnék bejelentést létrehozni elveszett, talált vagy kóborló állatról, hogy minél előbb megtalálják a gazdáját.
- **US-09-B**: Mint látogató, szeretnék bejelentéseket szűrni és böngészni, hogy megtudjam, van-e az enyémhez hasonló bejelentés.
- **US-09-C**: Mint bejelentő felhasználó, szeretném lezárni a bejelentésemet, ha az állat gazdára talált.
- **US-09-D**: Mint látogató, szeretnék interaktív térképen látni a bejelentéseket és menhelyeket, hogy gyorsan tájékozódjak az adott területen.

---

## Tesztesetek

---

### TC-09-01: Új bejelentés létrehozása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó (`user@test.hu`); a `/hu/reports/new` oldal elérhető |
| **URL** | `/hu/reports/new` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül nem érhető el – átirányít bejelentkezésre
- [ ] A form tartalmaz típus-választót: `LOST` (Elveszett), `FOUND` (Talált), `STRAY` (Kóborló)
- [ ] Kötelező mezők: típus, leírás, helyszín (szabad szöveges vagy térkép alapú)
- [ ] Opcionális mezők: fotó feltöltése, kontakt neve, kontakt telefonszáma/e-mail-je
- [ ] Fotó feltölthető (max. fájlméret ellenőrzés)
- [ ] Sikeres beküldés után a bejelentés `ACTIVE` státusszal jön létre
- [ ] Az oldal a `/hu/reports` vagy a bejelentés részletes oldalára (`/hu/reports/[id]`) irányít
- [ ] A bejelentés megjelenik a `/hu/reports` listában
- [ ] A bejelentés megjelenik a `/hu/map` térképen marker formájában (ha van koordináta)

**Tesztelési lépések:**
1. Navigálj a `/hu/reports/new` URL-re kijelentkezve – ellenőrizd az átirányítást.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj vissza.
3. Válaszd a típust: `LOST` (Elveszett).
4. Töltsd ki a kötelező mezőket:
   - Leírás: `Elveszett barna keverék kutya, nyakörv nélkül. Kb. 3 éves, kb. 15 kg.`
   - Helyszín: `Budapest, XIV. kerület, Zugló`
5. Töltsd ki az opcionális mezőket:
   - Kontakt neve: `Teszt Felhasználó`
   - Kontakt telefonszám: `+36 30 123 4567`
6. Töltsd fel a fotót (egy teszt kép, max 5 MB).
7. Kattints a „Bejelentés küldése" gombra.
8. Ellenőrizd, hogy az átirányítás megtörténik a részletes oldalra vagy a listára.
9. Navigálj a `/hu/reports` oldalra és ellenőrizd, hogy az új bejelentés megjelenik.
10. Próbálj meg bejelentést küldeni kötelező mező nélkül – ellenőrizd a hibaüzenetet.

**Elvárt eredmény:**
Az `AnimalReport` rekord `ACTIVE` státusszal és `LOST` típussal jön létre. A bejelentés megjelenik a listában. Hiányos form esetén hibaüzenetek jelennek meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-09-02: Bejelentések listájának megtekintése és szűrése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Az adatbázisban legalább 3-3 `ACTIVE` státuszú `LOST`, `FOUND` és `STRAY` típusú bejelentés létezik seed adatokkal |
| **URL** | `/hu/reports` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül is elérhető
- [ ] Alapértelmezetten az `ACTIVE` bejelentések listázódnak
- [ ] Minden `ReportCard`-on látható: típus (badge), leírás részlete, helyszín, dátum, fotó (ha van) és kontakt adat
- [ ] Típus szerinti szűrők elérhetők: Összes, Elveszett (`LOST`), Talált (`FOUND`), Kóborló (`STRAY`)
- [ ] Státusz szerinti szűrők elérhetők: Aktív (`ACTIVE`), Megoldott (`RESOLVED`), Lezárt (`CLOSED`)
- [ ] Szűrő kiválasztásakor az URL frissül (pl. `?type=LOST`), az oldal újratölt a szűrt eredményekkel
- [ ] Ha nincs találat, „Nincs ilyen bejelentés" üzenet jelenik meg
- [ ] Bejelentkezett felhasználónak saját bejelentéseit külön szekció mutatja (ha van)

**Tesztelési lépések:**
1. Navigálj a `/hu/reports` oldalra bejelentkezés nélkül.
2. Ellenőrizd, hogy a bejelentéskártyák megjelennek `ACTIVE` státusszal.
3. Kattints az „Elveszett" szűrőgombra.
4. Ellenőrizd, hogy az URL frissül (`?type=LOST`) és csak `LOST` típusú kártyák jelennek meg.
5. Kattints a „Talált" szűrőre – ellenőrizd, hogy csak `FOUND` kártyák láthatók.
6. Kattints a „Megoldott" státusz-szűrőre – ellenőrizd, hogy `RESOLVED` bejelentések jelennek meg (ha vannak).
7. Kombinált szűrő tesztelése: válaszd egyszerre a `FOUND` típust és `RESOLVED` státuszt.
8. Kattints az „Összes" visszaállítóra – ellenőrizd, hogy minden aktív bejelentés újra látszik.
9. Jelentkezz be `user@test.hu` / `User1234!` fiókkal – ellenőrizd, hogy a saját bejelentések szekció megjelenik.

**Elvárt eredmény:**
A szűrők funkcionálisan működnek, az URL frissül, az eredmény a szűrőknek megfelelő bejelentéseket mutatja. Nincs találat esetén üzenet jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-09-03: Bejelentés részleteinek megtekintése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Legalább egy aktív bejelentés létezik az adatbázisban; a bejelentés `id`-je ismert |
| **URL** | `/hu/reports/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül is elérhető
- [ ] A bejelentés teljes leírása megjelenik
- [ ] A típus badge (`LOST` / `FOUND` / `STRAY`) és a státusz badge (`ACTIVE`) megjelennek
- [ ] A helyszín megjelenik (szöveges és/vagy mini térkép)
- [ ] Ha van fotó, az megjelenik
- [ ] A kontakt adatok megjelennek (ha a bejelentő engedélyezte)
- [ ] A bejelentés dátuma megjelenik
- [ ] A bejelentő felhasználónak megjelenik a „Lezárás" (`ResolveButton`) gomb
- [ ] Más felhasználóknak / vendégeknek a lezárás gomb nem látható

**Tesztelési lépések:**
1. Navigálj a `/hu/reports` oldalra és kattints egy bejelentés-kártyára.
2. Ellenőrizd, hogy a `/hu/reports/[id]` oldalra navigál.
3. Ellenőrizd a típus badge, státusz badge, leírás, helyszín és dátum megjelenítését.
4. Ha van fotó, ellenőrizd, hogy a kép betölt.
5. Ellenőrizd, hogy a kontakt adatok (ha vannak) megjelennek.
6. Kijelentkezve ellenőrizd, hogy a „Lezárás" gomb NEM jelenik meg.
7. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj egy saját bejelentés részletoldalára.
8. Ellenőrizd, hogy a „Lezárás" / „Megoldottnak jelölés" gomb megjelenik.

**Elvárt eredmény:**
A részletes oldal betölt az összes adattal. A lezárás gomb csak a bejelentő felhasználónak jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-09-04: Bejelentés lezárása RESOLVED státuszba

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` bejelentkezve; a felhasználónak van legalább egy `ACTIVE` saját bejelentése (TC-09-01 lefutott) |
| **URL** | `/hu/reports/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `ResolveButton` komponens megjelenik a bejelentő felhasználónak
- [ ] A gombra kattintva megerősítő dialógus jelenik meg
- [ ] Megerősítés után a bejelentés státusza `RESOLVED`-re vált az adatbázisban
- [ ] Az oldalon a státusz badge frissül: „Megoldott" / `RESOLVED`
- [ ] A bejelentés eltűnik az alapértelmezett (aktív) szűrőjű listából
- [ ] A bejelentés megjelenik a `?status=RESOLVED` szűrőjű listában
- [ ] Más felhasználó nem tudja lezárni a bejelentést (a gomb nem jelenik meg számukra)

**Tesztelési lépések:**
1. Navigálj a `/hu/reports/[id]` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal (saját bejelentés).
2. Ellenőrizd, hogy a „Megoldottnak jelölöm" / „Lezárás" gomb megjelenik.
3. Kattints a gombra.
4. Ellenőrizd, hogy megerősítő dialógus jelenik meg.
5. Erősítsd meg a lezárást.
6. Ellenőrizd, hogy az oldalon a státusz badge „Megoldott"-ra / `RESOLVED`-re változik.
7. Navigálj a `/hu/reports` listára – ellenőrizd, hogy a bejelentés eltűnt az aktív listából.
8. Kattints a „Megoldott" státusz-szűrőre – ellenőrizd, hogy a lezárt bejelentés ott megjelenik.
9. Kijelentkezz és kíséreld meg elérni a részletes oldalt – ellenőrizd, hogy a lezárás gomb nem jelenik meg.

**Elvárt eredmény:**
A bejelentés `RESOLVED` státuszra vált, az aktív listából eltűnik, a megoldott szűrőnél megjelenik. Más felhasználók nem tudják lezárni.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-09-05: Térkép betöltése és markerek megjelenítése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Az adatbázisban legalább 2 bejelentés koordinátával és legalább 2 aktív menhely létezik |
| **URL** | `/hu/map` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül is elérhető
- [ ] A Leaflet térkép betölt és a csempék (`tiles`) megjelennek (OpenStreetMap vagy hasonló)
- [ ] A térkép Magyarország területét vagy az utolsó felhasználói helyszínt fókuszálja
- [ ] A bejelentés markerek megjelennek a térképen (különböző ikon/szín típusonként: elveszett, talált, kóborló)
- [ ] A menhely markerek megjelennek (pl. ház vagy mancs ikon)
- [ ] Markerre kattintva felugró ablak (`popup`) jelenik meg a bejelentés/menhely adataival
- [ ] A popup-ban link vezet a részletes oldalra
- [ ] A térkép gördülékeny; zoomolás és pánorámazás működik

**Tesztelési lépések:**
1. Navigálj a `/hu/map` URL-re bejelentkezés nélkül.
2. Ellenőrizd, hogy a Leaflet térkép betölt (csempék láthatók, nincs fehér/üres terület).
3. Ellenőrizd, hogy a markerek megjelennek a térképen.
4. Vizsgáld meg, hogy különböző ikonok jelzik a különböző típusú bejelentéseket és a menhelyeket.
5. Kattints egy bejelentés-markerre – ellenőrizd, hogy popup jelenik meg a bejelentés adataival.
6. Ellenőrizd, hogy a popup tartalmaz linket a részletes oldalra.
7. Kattints egy menhely-markerre – ellenőrizd a popup tartalmát.
8. Zoomolj be és ki – ellenőrizd, hogy a markerek helyesen jelennek meg.
9. Pánorámazd a térképet – ellenőrizd, hogy a mozgás gördülékeny.

**Elvárt eredmény:**
A Leaflet térkép betölt, a csempék megjelennek, a bejelentés és menhely markerek a helyes koordinátákon jelennek meg. A popupok funkcionálnak, a link a részletes oldalra vezet.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-09-06: Térkép szűrése típus és státusz szerint, mobilos panel

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Az adatbázisban legalább 2-2 `LOST`, `FOUND` és `STRAY` típusú aktív bejelentés koordinátával létezik; a teszt mobilos nézetben is elvégezhető (responsive) |
| **URL** | `/hu/map` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A térképen szűrőpanel elérhető (asztali nézetben oldalsó panel vagy felső sáv)
- [ ] A szűrők tartalmazzák: típus (LOST / FOUND / STRAY / mind) és státusz (ACTIVE / RESOLVED / mind)
- [ ] Típus szűrő aktiválásakor csak az adott típusú markerek láthatók a térképen
- [ ] Státusz szűrő aktiválásakor csak az adott státuszú markerek láthatók
- [ ] A szűrők kombinálhatók (pl. LOST + ACTIVE)
- [ ] Mobilos nézetben (`< 768px`) a szűrőpanel alapértelmezetten rejtett, és egy gombbal nyitható
- [ ] A szűrőpanel nyitásakor mobilon a panel az előtérbe csúszik (drawer/bottom sheet)
- [ ] A szűrők visszaállítása (mindent megjelenít) funkcionál

**Tesztelési lépések:**
1. Navigálj a `/hu/map` oldalra.
2. Azonosítsd a szűrőpanelt (oldalsó panel vagy felső sáv asztali nézetben).
3. Kapcsold be csak az „Elveszett" (`LOST`) típus szűrőt.
4. Ellenőrizd, hogy a térképen csak `LOST` típusú markerek láthatók.
5. Add hozzá a „Talált" (`FOUND`) szűrőt is – ellenőrizd, hogy mindkét típus markereit látod.
6. Állítsd vissza az összeset (`mind`).
7. Kapcsold be a „Megoldott" (`RESOLVED`) státusz szűrőt – ellenőrizd, hogy csak `RESOLVED` markerek láthatók (ha vannak).
8. Mobilos nézet tesztelése (DevTools → Responsive, pl. iPhone 12 = 390px széles):
   - Ellenőrizd, hogy a szűrőpanel rejtett.
   - Keresd meg a „Szűrők" / hamburger / szűrő gombot és kattints rá.
   - Ellenőrizd, hogy a panel megjelenik (drawer, bottom sheet vagy overlay).
   - Aktiválj egy szűrőt és ellenőrizd, hogy a térkép frissül.
   - Csukd be a panelt.

**Elvárt eredmény:**
A szűrők funkcionálnak: a kiválasztott típus/státusz alapján csak a megfelelő markerek jelennek meg a térképen. Mobilos nézetben a szűrőpanel nyitható és csukható.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
