# 02 – Állat böngészés, szűrés, kedvencek

## Összefoglalás

Ez a modul fedi le az állatböngészési felületet: az állatok listázását, szűrését, keresését, az egyedi állatprofilok megtekintését, valamint a bejelentkezett felhasználók kedvenckezelési funkcióit. Az oldal fő belépési pontja a `/hu/animals` útvonal, ahol a látogatók és a regisztrált felhasználók egyaránt böngészhetnek az örökbefogadható állatok között. Az állat részletes profilján az adott állathoz feltöltött hivatalos papírok (PDF/DOC/DOCX dokumentumok) is megtekinthetők, amennyiben a menhely csatolt ilyeneket. A dokumentumok feltöltése a dashboard felől történik: az állat létrehozásakor (`AddAnimalForm`, „Hivatalos papírok" szekció) vagy utólag az állat dashboard részletes oldalán.

## Felhasználói Történetek

- **US-02-A**: Mint látogató, szeretnék az összes elérhető állatot listázva látni, hogy gyorsan áttekinthessem az örökbefogadható állatokat.
- **US-02-B**: Mint látogató, szeretnék faj szerint szűrni (kutya, macska stb.), hogy csak a számomra releváns állatokat lássam.
- **US-02-C**: Mint látogató, szeretnék helyszín és méret szerint szűrni, hogy a közelben lévő és megfelelő méretű állatokat találjam meg.
- **US-02-D**: Mint látogató, szeretnék szabad szöveges kereséssel nevet vagy fajtát keresni, hogy egy konkrét állatot gyorsan megtalálhassak.
- **US-02-E**: Mint látogató, szeretnék egy állat részletes profilját megtekinteni, hogy minden szükséges információt megismerjek az örökbefogadás előtt.
- **US-02-F**: Mint bejelentkezett felhasználó, szeretnék állatokat kedvencnek jelölni, hogy később könnyen visszatérhessek hozzájuk.
- **US-02-G**: Mint bejelentkezett felhasználó, szeretnék kedvenceket eltávolítani és a kedvencek listámat szűrni, hogy naprakészen tarthassam a listámat.

## Tesztesetek

---

### TC-02-01: Állatok listájának betöltése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Az adatbázisban seed adatok betöltve, legalább 12 állat létezik `AVAILABLE` státusszal |
| **URL** | /hu/animals |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal 2 másodpercen belül betölt
- [ ] Az állatok kártyanézetben (grid) jelennek meg
- [ ] Minden kártyán látható: állat neve, faja, fotója (vagy placeholder), menhely neve, helyszín
- [ ] A lapozó (pagination) megjelenik, ha az állatok száma meghaladja az oldalankénti limitet (alapértelmezés: 12)
- [ ] A 2. oldalra navigálva más állatok töltődnek be
- [ ] Az URL frissül a lapszámnak megfelelően (pl. `?page=2`)
- [ ] Az összes állat száma megjelenik az oldal tetején (pl. „X állat található")

**Tesztelési lépések:**
1. Nyisd meg a böngészőt, és navigálj a `/hu/animals` URL-re (bejelentkezés nélkül).
2. Ellenőrizd, hogy a grid/kártyalista megjelenik és betölt.
3. Számold meg a megjelenő kártyákat – maximum 12-nek kell lennie az első oldalon.
4. Görgess az oldal aljára, és keresd a lapozó vezérlőt.
5. Kattints a „2. oldal" vagy a „Következő" gombra.
6. Ellenőrizd, hogy az URL megváltozik (`?page=2`), és új állatok töltődnek be.
7. Kattints vissza az 1. oldalra, ellenőrizd, hogy az eredeti lista tér vissza.

**Elvárt eredmény:**
A `/hu/animals` oldal sikeresen betölt, az állatok kártyanézetben jelennek meg, a lapozás funkcionális, és az URL helyesen tükrözi az aktuális oldalszámot. Az első oldalon legfeljebb 12 kártya látható.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-02: Szűrés faj szerint

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Seed adatbázisban legalább egy-egy `DOG`, `CAT`, `RABBIT`, `BIRD` és `OTHER` fajú állat létezik `AVAILABLE` státusszal |
| **URL** | /hu/animals |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A szűrő panel vagy szűrősáv tartalmazza a következő opciókat: Kutya (DOG), Macska (CAT), Nyúl (RABBIT), Madár (BIRD), Egyéb (OTHER)
- [ ] Egy faj kiválasztása után csak az adott fajhoz tartozó állatok jelennek meg
- [ ] Az URL frissül a szűrőnek megfelelően (pl. `?species=DOG`)
- [ ] A szűrő törlése/visszaállítása után ismét az összes állat megjelenik
- [ ] A „nincs találat" üzenet jelenik meg, ha egy fajhoz nincs elérhető állat
- [ ] Több faj egyszerre is kiválasztható (ha az UI támogatja), és az eredmény a kiválasztott fajok uniója

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra.
2. Keresd meg a faj szerinti szűrő vezérlőt (dropdown, checkbox-csoport vagy gombsor).
3. Válaszd ki a „Kutya" (DOG) opciót.
4. Ellenőrizd, hogy csak kutyák jelennek meg a listában.
5. Ellenőrizd az URL-t – tartalmaznia kell a `?species=DOG` (vagy hasonló) paramétert.
6. Változtass szűrőt: válaszd a „Macska" (CAT) opciót.
7. Ellenőrizd, hogy csak macskák jelennek meg.
8. Válaszd az „Egyéb" (OTHER) opciót, és ellenőrizd az eredményt.
9. Töröld a szűrőt, és ellenőrizd, hogy az összes állat visszatér.

**Elvárt eredmény:**
Minden fajszűrő megfelelően működik: a kiválasztott faj szerint szűri az eredményeket, az URL tartalmazza a szűrő paramétert, és a szűrő visszaállítása után a teljes lista visszaáll.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-03: Szűrés helyszín és méret szerint

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Seed adatbázisban különböző helyszínű és méretű (`SMALL`, `MEDIUM`, `LARGE`) állatok léteznek |
| **URL** | /hu/animals |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A helyszín szűrő (város/megye) megjelenik és működik
- [ ] A helyszínre szűrve csak az adott területen lévő menhelyekről érkező állatok jelennek meg
- [ ] A méret szűrő három értéket tartalmaz: Kis (SMALL), Közepes (MEDIUM), Nagy (LARGE)
- [ ] Méret szűrő alkalmazása után csak a megfelelő méretű állatok látszódnak
- [ ] A helyszín és méret szűrők egyszerre is alkalmazhatók (AND logika)
- [ ] Az aktív szűrők vizuálisan jelöltek (chip, badge vagy kiemelés)
- [ ] Az URL tartalmazza mindkét aktív szűrőt

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra.
2. Keresd meg a helyszín szűrőt, és válassz ki egy várost (pl. „Budapest").
3. Ellenőrizd, hogy csak budapesti menhelyekről érkező állatok jelennek meg.
4. Aktiváld a méret szűrőt is: válaszd a „Kis" (SMALL) opciót.
5. Ellenőrizd, hogy az eredmény szűkül: csak kis méretű, budapesti állatok látszódnak.
6. Állítsd vissza a helyszín szűrőt, de hagyd aktívan a méret szűrőt.
7. Ellenőrizd, hogy most minden kis méretű állat megjelenik (helyszíntől függetlenül).
8. Válts a „Nagy" (LARGE) méretre, és ellenőrizd az eredményt.
9. Töröld az összes szűrőt.

**Elvárt eredmény:**
A helyszín és méret szűrők egymástól függetlenül és együtt is pontosan működnek. Az eredményhalmazon AND logika érvényesül, az URL tükrözi az aktív szűrőket.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-04: Szabad szöveges keresés (állat neve, fajta)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Seed adatbázisban létezik legalább egy ismert nevű állat (pl. „Bodri") és ismert fajtájú állat (pl. „Labrador") |
| **URL** | /hu/animals |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A keresőmező megjelenik az oldal tetején vagy a szűrőpanel részeként
- [ ] Névre keresve (pl. „Bodri") csak az adott nevű állat(ok) jelennek meg
- [ ] Fajtára keresve (pl. „Labrador") csak a megfelelő fajtájú állatok jelennek meg
- [ ] A keresés kis- és nagybetűre nem érzékeny
- [ ] Részleges keresési kifejezés is működik (pl. „bod" megtalálja „Bodri"-t)
- [ ] Nem létező névre keresve „nincs találat" üzenet jelenik meg
- [ ] A keresőmező tartalmának törlésével az összes állat visszatér
- [ ] A keresés kombinálható a szűrőkkel (pl. „Labrador" + DOG fajszűrő)

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra.
2. Keresd meg a szöveges keresőmezőt.
3. Írd be egy seed állatnak a nevét (pl. „Bodri"), és nyomj Enter-t vagy várd meg a live search eredményét.
4. Ellenőrizd, hogy csak a „Bodri" nevű állat(ok) jelennek meg.
5. Töröld a keresőmezőt, és írd be egy fajta nevét (pl. „Labrador").
6. Ellenőrizd, hogy csak Labrador fajtájú állatok jelennek meg.
7. Írd be a keresőbe: „xyzabc123" (nem létező).
8. Ellenőrizd, hogy „nincs találat" üzenet jelenik meg.
9. Írd be: „bod" (részleges), és ellenőrizd, hogy „Bodri" megjelenik.
10. Kombináld a keresést egy szűrővel (pl. DOG fajszűrő + „Bodri" keresés).

**Elvárt eredmény:**
A keresés pontos találatokat ad névre és fajtára egyaránt, nem érzékeny a kis/nagybetűre, részleges kifejezéssel is működik, és nem létező kifejezésnél megfelelő visszajelzést ad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-05: Állat részletes oldal megtekintése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Seed adatbázisban létezik legalább egy AVAILABLE állapotú állat ismert slug-gal |
| **URL** | /hu/animals/[slug] |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állat neve, faja, fajtája, kora, mérete és neme megjelenik
- [ ] Legalább egy fotó megjelenik (vagy placeholder), galéria esetén lapozható
- [ ] Az állat leírása megjelenik (hosszabb szöveges tartalom)
- [ ] A menhely neve és linkje megjelenik, amely a menhely profiloldalára mutat
- [ ] Az „Örökbefogadás" gomb látható és kattintható (AVAILABLE állatnál)
- [ ] Az „Időpontot foglalok" gomb látható és kattintható
- [ ] Az oldal tartalmaz „Üzenetet küldök" gombot
- [ ] Bejelentkezés nélkül az örökbefogadási/időpontfoglaló gomb megnyomása a login oldalra irányít
- [ ] A menhely elhelyezkedése térképen is megjelenik (Leaflet térkép)
- [ ] Az oldal URL-je tartalmazza a slug-ot, és a slug megfelel az állat nevéből generált azonosítónak

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra.
2. Kattints egy állat kártyájára a listában.
3. Ellenőrizd, hogy az URL a `/hu/animals/[slug]` formára vált.
4. Ellenőrizd az összes megjelenített adatmezőt (név, faj, fajta, kor, méret, nem, leírás).
5. Ha több fotó van, ellenőrizd a galéria lapozhatóságát.
6. Kattints a menhely nevére, és ellenőrizd, hogy a menhely profiloldalára irányít.
7. Ellenőrizd a Leaflet térkép megjelenését.
8. Kattints az „Örökbefogadás" gombra bejelentkezés nélkül – ellenőrizd a login oldalra irányítást.
9. Kattints vissza, és ellenőrizd az „Időpontot foglalok" gombot is.

**Elvárt eredmény:**
A részletes állat oldal az összes releváns adatot megjeleníti, a galériák, térkép és gombok funkcionálisan működnek. Bejelentkezés nélküli interakció esetén a rendszer a login oldalra irányít.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-06: Állat kedvencnek jelölése (bejelentkezett user)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; az adatbázisban seed állatok elérhetők |
| **URL** | /hu/animals, /hu/animals/[slug] |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állat kártyán és a részletes oldalon szív/kedvenc ikon jelenik meg
- [ ] Bejelentkezett állapotban a kedvenc ikonra kattintva az állat kedvencnek jelölődik (ikon kitölt/aktív lesz)
- [ ] A kedvenc jelölés azonnal visszajelzést ad (optimistic UI vagy toast üzenet)
- [ ] A kedvencnek jelölt állat megjelenik a `/hu/favorites` (vagy `/hu/profile/favorites`) oldalon
- [ ] Bejelentkezés nélkül a kedvenc ikonra kattintva login oldalra irányít
- [ ] Lap újratöltése után a kedvenc állapot megmarad (adatbázisban perzisztált)
- [ ] Egy állatot csak egyszer lehet kedvencnek jelölni (a második kattintás eltávolítja)

**Tesztelési lépések:**
1. Navigálj a `/hu/login` oldalra, és jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/animals` oldalra.
3. Keresd meg a szív/kedvenc ikont egy állat kártyáján, és kattints rá.
4. Ellenőrizd, hogy az ikon megváltozik (aktív/teli szív állapot), és megjelenik visszajelzés.
5. Navigálj a `/hu/animals/[az imént kedvencnek jelölt állat slug-ja]` oldalra.
6. Ellenőrizd, hogy a részletes oldalon is aktív a kedvenc ikon.
7. Töltsd újra az oldalt (F5), és ellenőrizd, hogy az aktív állapot megmarad.
8. Navigálj a kedvencek oldalra (pl. `/hu/favorites`), és ellenőrizd, hogy az állat megjelenik.

**Elvárt eredmény:**
A bejelentkezett felhasználó kedvencnek jelölhet állatokat a lista- és a részletes nézetből egyaránt. A jelölés azonnal visszajelzést ad, perzisztált, és megjelenik a kedvencek oldalon. Bejelentkezés nélküli próbálkozás loginra irányít.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-07: Kedvencek eltávolítása és kedvencek oldal szűrése

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; a felhasználónak legalább 3 különböző fajú állat van kedvencnek jelölve (TC-02-06 előfeltétel) |
| **URL** | /hu/favorites |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/favorites` oldal lista vagy grid nézetben megjeleníti az összes kedvenc állatot
- [ ] Minden kedvenc kártyán megjelenik az eltávolítás (szív kitöltött / törlés) gomb
- [ ] Eltávolítás után az állat azonnal eltűnik a kedvencek listájából
- [ ] Az eltávolítás az állatlistán (`/hu/animals`) is megjelenik (a szív ikon inaktívvá válik)
- [ ] A kedvencek oldalon szűrés lehetséges faj szerint
- [ ] Ha nincs kedvenc, az oldal megfelelő „üres lista" üzenetet jelenít meg
- [ ] Bejelentkezés nélküli `/hu/favorites` látogatás login oldalra irányít

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`, és győződj meg róla, hogy legalább 3 különböző fajú állat kedvencnek van jelölve.
2. Navigálj a `/hu/favorites` oldalra.
3. Ellenőrizd, hogy az összes kedvenc megjelenik.
4. Kattints egy állat eltávolítás gombjára.
5. Ellenőrizd, hogy az állat azonnal eltűnik a kedvencek listájából, és megjelenik visszajelzés.
6. Navigálj vissza az `/hu/animals` oldalra, és keresd meg az imént eltávolított állatot – ellenőrizd, hogy a szív ikon inaktív.
7. Térj vissza a `/hu/favorites` oldalra.
8. Ha van faj szűrő, válassz egy fajt (pl. Kutya), és ellenőrizd a szűrt listát.
9. Távolítsd el az összes kedvencet, és ellenőrizd az „üres lista" üzenetet.
10. Jelentkezz ki, és próbálj közvetlenül navigálni a `/hu/favorites` URL-re – ellenőrizd az átirányítást.

**Elvárt eredmény:**
A kedvencek eltávolítása azonnal és szinkronizáltan működik az összes nézetben. A kedvencek oldal szűrhető, az üres állapot kezelése megfelelő, és a bejelentkezés védi az oldalt.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-08: Állat létrehozása hivatalos papírokkal (dokumentum-feltöltés mentés előtt)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett admin: `admin@test.hu` / `Admin1234!` (super admin) VAGY `shelter@test.hu` / `Admin1234!` (menhely admin); rendelkezésre áll legalább egy érvényes PDF (max 10 MB) teszt dokumentum |
| **URL** | /dashboard/animals |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Új állat" panelben (`AddAnimalForm`) megjelenik a „Hivatalos papírok" szekció
- [ ] A szekcióban PDF, DOC és DOCX kiterjesztésű fájlok tölthetők fel, fájlonként legfeljebb 10 MB méretben
- [ ] A dokumentumok a mentés ELŐTT feltölthetők (kliens oldali feltöltés a Vercel Blob tárolóba a `/api/upload/document` végponton keresztül)
- [ ] A sikeresen feltöltött dokumentumok eltávolítható listaként jelennek meg a formban (fájlnév látható)
- [ ] Az állat mentésekor a dokumentumok atomi módon, az állattal együtt mentődnek `AnimalDocument` rekordként (a `/api/animals` POST a `documents[]` tömböt `{url, name, fileType, sizeBytes}` mezőkkel fogadja)
- [ ] Mentés után a feltöltött dokumentumok megjelennek az állat dashboard részletes oldalának dokumentumok szekciójában (`/dashboard/animals/[id]`)
- [ ] A dokumentumok megjelennek a nyilvános állat oldalon (`/hu/animals/[slug]`) is
- [ ] A funkció super admin és menhely admin számára egyaránt működik (közös form)

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` (vagy `admin@test.hu` / `Admin1234!`) fiókkal, és navigálj a `/dashboard/animals` oldalra.
2. Kattints az „Új állat" gombra a hozzáadó panel megnyitásához.
3. Töltsd ki a kötelező mezőket (Faj: `DOG`, Név: `Papíros Teszt`), és tetszőlegesen a többit.
4. Görgess a „Hivatalos papírok" szekcióhoz.
5. Tölts fel egy érvényes PDF dokumentumot (pl. `oltasi_konyv.pdf`, max 10 MB).
6. Ellenőrizd, hogy a feltöltés után a dokumentum megjelenik a form eltávolítható listájában, a fájlnevével.
7. Kattints a „Mentés" / „Hozzáadás" gombra.
8. Ellenőrizd, hogy az állat létrejön, és nyisd meg a részletes dashboard oldalát (`/dashboard/animals/[id]`).
9. Ellenőrizd, hogy a feltöltött dokumentum megjelenik a dokumentumok szekcióban, és megnyitható/letölthető.
10. Navigálj a nyilvános `/hu/animals/[slug]` oldalra, és ellenőrizd, hogy a dokumentum ott is megjelenik.

**Elvárt eredmény:**
Az állat a hozzá feltöltött hivatalos papírokkal együtt, egyetlen mentési műveletben jön létre. A dokumentumok `AnimalDocument` rekordként mentődnek, és megjelennek mind a dashboard részletes oldalon, mind a nyilvános állat oldalon. A funkció super admin és menhely admin szerepkörrel egyaránt működik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-02-09: Dokumentum eltávolítása mentés előtt és fájl-validáció (típus, méret)

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | Bejelentkezett admin: `admin@test.hu` / `Admin1234!` vagy `shelter@test.hu` / `Admin1234!`; rendelkezésre áll egy érvényes DOCX teszt fájl, egy nem támogatott típusú fájl (pl. `.png` vagy `.txt`), és egy 10 MB-nál nagyobb fájl |
| **URL** | /dashboard/animals |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Hivatalos papírok" szekcióban feltöltött dokumentum a listából eltávolítható a mentés előtt
- [ ] Az eltávolított dokumentum nem kerül mentésre az állattal együtt (nem jön létre `AnimalDocument` rekord hozzá)
- [ ] Nem támogatott fájltípus (nem PDF/DOC/DOCX) feltöltése elutasításra kerül, hibaüzenettel
- [ ] A 10 MB-os fájlméret-korlátot meghaladó fájl feltöltése elutasításra kerül, hibaüzenettel
- [ ] Az érvényes (elfogadott típusú, méreten belüli) dokumentumok továbbra is feltölthetők és megjelennek a listában

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/animals` oldalra.
2. Nyisd meg az „Új állat" panelt, és töltsd ki a kötelező mezőket.
3. A „Hivatalos papírok" szekcióban tölts fel két érvényes dokumentumot (pl. egy PDF-et és egy DOCX-et).
4. Ellenőrizd, hogy mindkét dokumentum megjelenik az eltávolítható listában.
5. Távolítsd el az egyik dokumentumot a lista eltávolítás gombjával.
6. Ellenőrizd, hogy a dokumentum eltűnik a listából.
7. Kíséreld meg egy nem támogatott típusú fájl (pl. `kep.png` vagy `jegyzet.txt`) feltöltését – ellenőrizd, hogy a rendszer elutasítja, és hibaüzenetet jelenít meg.
8. Kíséreld meg egy 10 MB-nál nagyobb fájl feltöltését – ellenőrizd az elutasítást és a hibaüzenetet.
9. Mentsd az állatot, és ellenőrizd, hogy csak a megmaradt (eltávolítás után visszamaradt) érvényes dokumentum mentődött el.

**Elvárt eredmény:**
A mentés előtt eltávolított dokumentumok nem mentődnek. A nem támogatott típusú, illetve a 10 MB-ot meghaladó fájlok feltöltése validációs hibaüzenettel elutasításra kerül. Csak az érvényes és a listában megmaradt dokumentumok jönnek létre `AnimalDocument` rekordként.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
