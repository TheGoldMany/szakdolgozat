# 04 – Menhely profil, értékelések

## Összefoglalás

Ez a modul a menhelyekkel kapcsolatos nyilvános felületet fedi le: a menhely listát, az egyedi menhely profil oldalát, az örökbefogadók általi értékelési rendszert, valamint a hitelesített menhely badge megjelenítését. A menhelyek böngészhetők és értékelhetők, az értékelések átlagpontozása valós időben frissül, és a hitelesített státusz vizuálisan jelzett.

A modul kiegészült az önkiszolgáló menhely-regisztrációval: a nyilvános regisztrációs oldalon (`/hu/auth/register`) egy felhasználó menhelyként is regisztrálhat, ekkor a rendszer aktív (`isActive: true`), de még nem hitelesített (`isVerified: false`) menhelyet hoz létre, a regisztráló felhasználót pedig `SHELTER_ADMIN` szerepkörrel hozzáköti. Az új menhely a super admin hitelesítéséig függőben marad. Regisztrációkor a menhely címét a rendszer automatikusan geokódolja (OpenStreetMap Nominatim), így koordinátákkal a nyilvános térképen is megjelenik. A super admin `/hu/dashboard/shelters` felületén két geokódoló művelet érhető el: „Koordináták pótlása" (csak a koordináta nélküli menhelyek geokódolása) és „Pontosítás cím alapján" (az összes menhely újra-geokódolása a pontos cím alapján).

---

## Felhasználói Történetek

- **US-04-A**: Mint látogató, szeretnék a platformon regisztrált összes menhelyet listázva látni, hogy megtaláljam a közelemben lévő menhelyeket.
- **US-04-B**: Mint látogató, szeretnék egy adott menhely részletes profilját megtekinteni, hogy megismerhessem a menhely adatait és az ott lévő állatokat.
- **US-04-C**: Mint örökbefogadó felhasználó, szeretnék értékelést írni egy menhelyről, hogy visszajelzést adjak a tapasztalatomról.
- **US-04-D**: Mint látogató, szeretném látni a menhely átlagos értékelését és az összes korábbi értékelést, hogy megalapozott döntést hozhassak.
- **US-04-E**: Mint látogató, szeretnék vizuálisan megkülönböztetni a hitelesített menhelyeket, hogy megbízhassak az általuk feltüntetett adatokban.
- **US-04-F**: Mint menhely-üzemeltető, szeretnék a nyilvános regisztrációs oldalon menhelyként regisztrálni, hogy önállóan létrehozhassam a menhelyem profilját, és az a super admin hitelesítése után teljes értékűvé váljon.
- **US-04-G**: Mint super admin, szeretném a menhelyek koordinátáit cím alapján pótolni vagy pontosítani, hogy minden menhely a helyes ponton jelenjen meg a térképen.

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

---

### TC-04-06: Önkiszolgáló menhely-regisztráció és függőben lévő státusz

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Nincs bejelentkezett felhasználó; a `/hu/auth/register` oldal elérhető; a regisztrációhoz használt e-mail cím még nincs foglalva |
| **URL** | `/hu/auth/register` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A regisztrációs oldalon választható a menhelyként történő regisztráció opciója (nem csak sima felhasználói fiók)
- [ ] A menhely opció kiválasztásakor megjelennek a menhely-specifikus mezők: menhely neve, cím, város, telefonszám, e-mail
- [ ] Sikeres regisztráció után létrejön egy `Shelter` rekord `isActive: true` és `isVerified: false` értékekkel
- [ ] A regisztráló felhasználó `SHELTER_ADMIN` szerepkörrel a menhelyhez kapcsolódik
- [ ] A menhely a hitelesítésig függőben marad: nem jelenik meg a hitelesített badge
- [ ] A megadott cím regisztrációkor automatikusan geokódolásra kerül (koordináták keletkeznek)
- [ ] A koordinátákkal rendelkező, aktív menhely megjelenik a nyilvános menhely listában és a térképen
- [ ] Kötelező mezők hiányában a form nem küldhető el, validációs hibaüzenetek jelennek meg

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/register` oldalra bejelentkezés nélkül.
2. Válaszd a menhelyként történő regisztráció opcióját.
3. Ellenőrizd, hogy megjelennek a menhely-specifikus mezők.
4. Töltsd ki a mezőket:
   - Menhely neve: `Teszt Menhely Egyesület`
   - Cím: `Budapest, Bartók Béla út 83.`
   - Város: `Budapest`
   - Telefonszám: `+36 1 234 5678`
   - E-mail: `uj-menhely@test.hu`
   - Jelszó és jelszó megerősítése.
5. Próbáld meg elküldeni a formot egy kötelező mező (pl. menhely neve) kitöltése nélkül – ellenőrizd a validációt.
6. Töltsd ki helyesen a formot, és küldd be a regisztrációt.
7. Ellenőrizd, hogy a fiók létrejön és a regisztráló felhasználó a menhely `SHELTER_ADMIN`-jaként van bejelentkezve.
8. Navigálj a `/hu/shelters` oldalra, és ellenőrizd, hogy az új menhely megjelenik a listában, de hitelesített badge nélkül.
9. Jelentkezz be super adminként: `admin@test.hu` / `Admin1234!`, és navigálj a `/hu/dashboard/shelters` felületre.
10. Keresd meg az új menhelyt, és állítsd hitelesítettre (verify).
11. Töltsd újra a `/hu/shelters` oldalt, és ellenőrizd, hogy immár megjelenik a hitelesített badge.

**Elvárt eredmény:**
A menhely-regisztráció aktív, de nem hitelesített menhelyet hoz létre, a regisztrálót `SHELTER_ADMIN`-ként hozzákötve. A menhely a super admin hitelesítéséig függőben van (nincs badge), majd hitelesítés után megjelenik a badge.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-04-07: Menhely cím geokódolása és térképre helyezése regisztrációkor

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Nincs bejelentkezett felhasználó; a `/hu/auth/register` oldal elérhető; internetkapcsolat a Nominatim geokódoló eléréséhez |
| **URL** | `/hu/auth/register`, `/hu/map` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely regisztrációjakor a cím lat/lng koordinátákra konvertálódik OpenStreetMap Nominatim segítségével
- [ ] A geokódolás először strukturált lekérdezést próbál (utca + házszám, irányítószám, város)
- [ ] Ha a strukturált lekérdezés sikertelen, szabad szöveges lekérdezéssel próbálkozik
- [ ] Ha az is sikertelen, végső esetben a város központjának koordinátáira esik vissza
- [ ] A címben szereplő emelet/ajtó toldalékok (pl. „A. 2/6") eltávolításra kerülnek, hogy a házszám helyesen feloldódjon (pl. „Bartók Béla út 83. A. 2/6" → „Bartók Béla út 83")
- [ ] A koordináták birtokában a menhely megjelenik a nyilvános térképen (`/hu/map`)

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/register` oldalra, és válaszd a menhelyként történő regisztrációt.
2. Töltsd ki a menhely adatait egy emelet/ajtó toldalékot tartalmazó címmel:
   - Cím: `Bartók Béla út 83. A. 2/6`
   - Város: `Budapest`
   - (irányítószám, ha van mező: `1114`)
3. Fejezd be a regisztrációt.
4. Ellenőrizd az adatbázisban vagy a menhely profiloldalán, hogy a menhelyhez lat/lng koordináták rendelődtek (nem null).
5. Ellenőrizd, hogy a koordináta a Bartók Béla út 83. házszámhoz közeli pont (nem a városközpont), tehát a toldalék eltávolítása helyesen működött.
6. Regisztrálj egy másik menhelyt szándékosan hibás/feloldhatatlan házszámmal, és ellenőrizd, hogy a geokódolás a szabad szöveges, majd végső esetben a városközpont koordinátáira esik vissza (a menhely kap koordinátát, nem marad null).
7. Navigálj a `/hu/map` oldalra, és ellenőrizd, hogy a geokódolt menhely markerként megjelenik a térképen.

**Elvárt eredmény:**
A menhely címe a strukturált → szabad szöveges → városközpont visszaesési sorrend szerint geokódolódik, az emelet/ajtó toldalékok eltávolításával a házszám helyesen feloldódik, és a menhely a kapott koordinátákkal megjelenik a nyilvános térképen.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-04-08: Super admin geokódoló gombok – koordináták pótlása és pontosítása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett super admin: `admin@test.hu` / `Admin1234!`; az adatbázisban van legalább egy koordináta nélküli menhely és legalább egy koordinátákkal rendelkező menhely |
| **URL** | `/hu/dashboard/shelters` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/dashboard/shelters` felületen megjelenik két geokódoló gomb: „Koordináták pótlása" és „Pontosítás cím alapján"
- [ ] A „Koordináták pótlása" gomb csak a koordináta nélküli menhelyeket geokódolja, a meglévő koordinátákat nem írja felül
- [ ] A „Pontosítás cím alapján" gomb az ÖSSZES menhelyt újra-geokódolja a pontos cím alapján, felülírva a jelenlegi koordinátákat
- [ ] A geokódolás a Nominatim strukturált → szabad szöveges → városközpont visszaesési logikáját használja
- [ ] A művelet befejezéséről visszajelzés (pl. hány menhely frissült) jelenik meg
- [ ] A frissített koordináták tükröződnek a nyilvános térképen (`/hu/map`)

**Tesztelési lépések:**
1. Jelentkezz be super adminként: `admin@test.hu` / `Admin1234!`.
2. Navigálj a `/hu/dashboard/shelters` felületre.
3. Ellenőrizd, hogy a „Koordináták pótlása" és „Pontosítás cím alapján" gombok láthatók.
4. Jegyezd fel egy koordinátákkal rendelkező menhely aktuális lat/lng értékét.
5. Kattints a „Koordináták pótlása" gombra.
6. Ellenőrizd, hogy a korábban koordináta nélküli menhelyek koordinátát kaptak, a meglévő koordinátás menhely értéke pedig változatlan.
7. Kattints a „Pontosítás cím alapján" gombra.
8. Ellenőrizd, hogy az összes menhely koordinátája újraszámolódott a pontos cím alapján (a korábban feljegyzett érték felülíródhatott).
9. Ellenőrizd a művelet visszajelzését (frissített menhelyek száma).
10. Navigálj a `/hu/map` oldalra, és ellenőrizd, hogy a menhelyek a frissített koordinátákon jelennek meg.

**Elvárt eredmény:**
A „Koordináták pótlása" csak a hiányzó koordinátákat tölti ki, a „Pontosítás cím alapján" pedig az összes menhelyt újra-geokódolja és felülírja a koordinátákat. A frissített pozíciók a nyilvános térképen tükröződnek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
