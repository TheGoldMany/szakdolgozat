# 04 – Menhely profil, értékelések

## Összefoglalás

Ez a modul a menhelyekkel kapcsolatos nyilvános felületet fedi le: a menhely listát, az egyedi menhely profil oldalát, az örökbefogadók általi értékelési rendszert, valamint a hitelesített menhely badge megjelenítését. A menhelyek böngészhetők és értékelhetők, az értékelések átlagpontozása valós időben frissül, és a hitelesített státusz vizuálisan jelzett.

---

## Felhasználói Történetek

- **US-04-A**: Mint látogató, szeretnék a platformon regisztrált összes menhelyet listázva látni, hogy megtaláljam a közelemben lévő menhelyeket.
- **US-04-B**: Mint látogató, szeretnék egy adott menhely részletes profilját megtekinteni, hogy megismerhessem a menhely adatait és az ott lévő állatokat.
- **US-04-C**: Mint örökbefogadó felhasználó, szeretnék értékelést írni egy menhelyről, hogy visszajelzést adjak a tapasztalatomról.
- **US-04-D**: Mint látogató, szeretném látni a menhely átlagos értékelését és az összes korábbi értékelést, hogy megalapozott döntést hozhassak.
- **US-04-E**: Mint látogató, szeretnék vizuálisan megkülönböztetni a hitelesített menhelyeket, hogy megbízhassak az általuk feltüntetett adatokban.

---

## Tesztesetek

---

### TC-04-01: Menhely lista megtekintése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Seed adatbázisban legalább 2 menhely létezik aktív állatokkal |
| **URL** | `/hu/shelters` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/shelters` oldal kártyanézetben listázza az összes aktív menhelyet
- [ ] Minden kártyán megjelenik: a menhely neve, logója (vagy placeholder), helyszíne (város/megye), és az aktív (AVAILABLE státuszú) állatok száma
- [ ] A kártyák kattinthatók, és a menhely profiloldalára navigálnak
- [ ] Az oldal 2 másodpercen belül betölt
- [ ] Ha egy menhelynek van aktív állata, az állatok száma helyesen jelenik meg
- [ ] A lista szűrhető vagy rendezhető helyszín szerint (ha az UI támogatja)
- [ ] A hitelesített menhelyek vizuálisan kiemeltek (badge vagy ikon)

**Tesztelési lépések:**
1. Navigálj a `/hu/shelters` URL-re bejelentkezés nélkül.
2. Ellenőrizd, hogy a menhelykártyák megjelennek.
3. Ellenőrizd minden kártyán: menhely neve, logó/placeholder, helyszín, aktív állatok száma.
4. Hasonlítsd össze az aktív állatok számát az adatbázis seed adataival (shelter@test.hu menhelyéhez tartozó AVAILABLE állatoknál).
5. Ha van szűrési lehetőség, alkalmazd helyszín szerint, és ellenőrizd a szűrt listát.
6. Kattints egy menhely kártyájára, és ellenőrizd, hogy a részletes profiloldalra navigál.
7. Menj vissza, és ellenőrizd, hogy a hitelesített menhely kártyáján megjelenik a badge.

**Elvárt eredmény:**
A menhely lista helyesen betölt, az összes releváns adat megjelenik minden kártyán, a kártyák navigálhatók, és a hitelesített menhelyek vizuálisan megkülönböztethetők.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-04-02: Menhely részletes profil megtekintése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Seed adatbázisban létezik menhely ismert slug-gal (shelter@test.hu menhelyéhez tartozó slug); az adatbázisban legalább egy AVAILABLE állat tartozik a menhelyhez |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely logója és neve kiemelten megjelenik az oldal tetején
- [ ] A menhely leírása (hosszabb szöveges tartalom) megjelenik
- [ ] Az elérhetőségi adatok megjelennek: cím, telefonszám, e-mail, weboldal (ha van)
- [ ] A menhelyhez tartozó állatok listája megjelenik (AVAILABLE státuszú állatok)
- [ ] Az állat kártyák kattinthatók, és az állat részletes oldalára navigálnak
- [ ] A menhely elhelyezkedése Leaflet térképen is megjelenik (ha a koordináták adottak)
- [ ] A menhely nyitvatartási ideje megjelenik (ha van)
- [ ] A hitelesített badge megjelenik (ha a menhely hitelesített)
- [ ] Az értékelési szekció látható az oldal alján: átlagpontozás és korábbi értékelések

**Tesztelési lépések:**
1. Navigálj a `/hu/shelters` oldalra, és kattints a seed menhely kártyájára.
2. Ellenőrizd, hogy az URL `/hu/shelters/[slug]` formára változik.
3. Ellenőrizd a logó és menhely neve megjelenését az oldal tetején.
4. Olvasd el a leírás szekciót – tartalomnak kell lennie.
5. Ellenőrizd az elérhetőségi adatokat (cím, telefonszám, e-mail).
6. Görgess le az állatok listájához, és ellenőrizd, hogy az AVAILABLE állatok megjelennek.
7. Kattints egy állat kártyájára – ellenőrizd, hogy az `/hu/animals/[slug]` oldalra irányít.
8. Menj vissza, és ellenőrizd a Leaflet térkép megjelenését.
9. Ellenőrizd az értékelési szekciót: átlagcsillag, értékelések száma, értékelések listája.

**Elvárt eredmény:**
A menhely profiloldala minden releváns adatot megjelenít: logó, leírás, elérhetőségek, állatlista, térkép és értékelések. Az állatoknál az állat oldalra mutató linkek működnek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-04-03: Értékelés beküldése menhelyre (csak örökbefogadónak)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; a felhasználónak legyen `APPROVED` státuszú kérelme a seed menhely egyik állatára (örökbefogadói jogosultság) |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az értékelési form csak bejelentkezett felhasználóknak jelenik meg
- [ ] Az értékelési form csak akkor érhető el, ha a felhasználónak van `APPROVED` örökbefogadása az adott menhelyből
- [ ] A form tartalmaz 1–5 csillagos értékelőt (kötelező) és szöveges megjegyzés mezőt (opcionális vagy kötelező)
- [ ] Csillagos értékelés nélkül a form nem küldhető el
- [ ] Sikeres beküldés után az értékelés megjelenik az értékelések listájában
- [ ] Egy felhasználó ugyanarra a menhelyre csak egyszer küldhet értékelést
- [ ] Bejelentkezés nélkül az értékelési szekció helyett belépési felszólítás jelenik meg
- [ ] Nem-örökbefogadó (nincs APPROVED kérelme) felhasználó nem küldhet értékelést

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!` (akinek van APPROVED kérelme a seed menhelynél).
2. Navigálj a seed menhely profiloldalára: `/hu/shelters/[slug]`.
3. Görgess le az értékelési szekcióhoz.
4. Ellenőrizd, hogy az értékelési form megjelenik (és nem csak a meglévő értékelések listája).
5. Próbálj meg beküldeni üres formot (csillag és szöveg nélkül) – ellenőrizd a validációt.
6. Kattints a 4. csillagra (4/5 értékelés).
7. Írd be a szöveges megjegyzést: „Nagyon segítőkész csapat, ajánlom mindenkinek!"
8. Kattints a „Beküldés" gombra.
9. Ellenőrizd, hogy az értékelés megjelenik a listában a neveddel és a csillagokkal.
10. Próbálj meg újabb értékelést beküldeni – ellenőrizd, hogy a rendszer megakadályozza (duplikát).
11. Jelentkezz ki, és ellenőrizd, hogy az értékelési form eltűnik (belépési felszólítás jelenik meg).

**Elvárt eredmény:**
Örökbefogadói jogosultsággal rendelkező bejelentkezett felhasználó sikeresen értékelhet, az értékelés megjelenik a listában, duplikált értékelés nem lehetséges. Bejelentkezés nélkül és nem-örökbefogadónak az értékelési form nem érhető el.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-04-04: Értékelés megjelenítése és átlagpontozás frissülése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Seed adatbázisban a seed menhely profilján legalább egy meglévő értékelés létezik; bejelentkezett felhasználó: `user@test.hu` / `User1234!` (APPROVED kérelemmel) |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely profiloldalán megjelenik az átlagos csillagos értékelés (pl. „4.3 / 5")
- [ ] Az értékelések száma megjelenik (pl. „12 értékelés")
- [ ] Minden egyes értékelésnél megjelenik: a felhasználó neve (vagy anonimizált forma), a csillagok száma, a szöveges megjegyzés és a dátum
- [ ] Új értékelés beküldése után az átlagpontozás azonnal (lap újratöltés után) frissül
- [ ] Az értékelések lista kronológikus sorrendben jelenik meg (legújabb elöl)
- [ ] Az átlagpontozás matematikailag helyes (összes csillag összege / értékelések száma, 1 tizedes pontossággal)

**Tesztelési lépések:**
1. Navigálj a seed menhely profiloldalára: `/hu/shelters/[slug]`.
2. Görgess le az értékelési szekcióhoz.
3. Jegyezd fel az aktuális átlagpontozást és értékelések számát (pl. „3.5 / 5, 2 értékelés").
4. Jelentkezz be: `user@test.hu` / `User1234!`, és küldj be egy 5 csillagos értékelést.
5. Töltsd újra a menhely profiloldalát.
6. Ellenőrizd, hogy az értékelések száma eggyel nőtt (pl. 3 értékelés).
7. Ellenőrizd, hogy az átlagpontozás helyesen frissült (pl. (3.5×2 + 5) / 3 = 4.0).
8. Ellenőrizd, hogy az új értékelés a lista tetején jelenik meg.
9. Ellenőrizd az értékelés részleteit: felhasználó neve, 5 csillag, megjegyzés szövege, dátum.

**Elvárt eredmény:**
Az átlagpontozás és értékelések száma matematikailag pontos, valós időben frissül az új értékelések beküldése után. Minden értékelés összes adata korrektül jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-04-05: Hitelesített menhely badge megjelenése

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | Seed adatbázisban létezik legalább egy hitelesített (`verified: true`) menhely és legalább egy nem hitelesített menhely |
| **URL** | `/hu/shelters`, `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A hitelesített menhely kártyáján a menhely listában megjelenik egy vizuális badge/ikon (pl. kék pipa, „Hitelesített" felirat)
- [ ] A nem hitelesített menhely kártyáján nem jelenik meg a badge
- [ ] A hitelesített menhely részletes profiloldalán is megjelenik a badge a menhely neve mellett
- [ ] A badge tooltip-je vagy szövege informatív: „Ez a menhely hitelesített" vagy hasonló
- [ ] A hitelesítési státusz NEM állítható be a felhasználói felületen (csak admin jogosultsággal)
- [ ] Platform admin (`admin@test.hu` / `Admin1234!`) a `/hu/admin` dashboardon be tudja kapcsolni a hitelesítési státuszt

**Tesztelési lépések:**
1. Navigálj a `/hu/shelters` oldalra bejelentkezés nélkül.
2. Keresd meg a hitelesített menhelyt (a seed adatok alapján a `shelter@test.hu` menhelye hitelesített legyen).
3. Ellenőrizd, hogy a kártyán megjelenik a badge/ikon.
4. Keresd meg a nem hitelesített menhelyt (ha van a seed adatokban), és ellenőrizd, hogy ott nincs badge.
5. Kattints a hitelesített menhely kártyájára.
6. Ellenőrizd, hogy a részletes profiloldalon is megjelenik a badge a menhely neve mellett.
7. Vidd az egeret a badge fölé (tooltip), és ellenőrizd az informatív szöveget.
8. Jelentkezz be platform adminként: `admin@test.hu` / `Admin1234!`.
9. Navigálj az `/hu/admin` dashboardra, és keresd meg a menhely-kezelés szekciót.
10. Ellenőrizd, hogy van lehetőség a hitelesítési státusz be-/kikapcsolására.
11. Kapcsold ki a hitelesítést az egyik menhelynél, töltsd újra a `/hu/shelters` oldalt, és ellenőrizd, hogy a badge eltűnik.

**Elvárt eredmény:**
A hitelesített menhelyek a lista és a profiloldalon egyaránt vizuálisan jelöltek, a badge informatív tooltippel rendelkezik. A státusz csak platform admin szinten módosítható.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
