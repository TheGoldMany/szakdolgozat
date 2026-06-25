# 11 – Admin dashboard: állatok, kérelmek, készlet, közösség

## Összefoglalás

Ez a modul fedi le a menhely adminisztrátor dashboard funkcióit. Az adminok KPI kártyákat és analytics paneleket látnak a főoldalon, kezelhetik az állatokat (hozzáadás, státuszváltás, egészségügyi napló), elbírálhatják az örökbefogadási kérelmeket, és kezelhetik a menhely készletét (tételek hozzáadása, be- és kivételezés, alacsony készlet riasztás). A dashboard a `/dashboard` útvonalon érhető el, amely csak `SHELTER_ADMIN` és `SUPER_ADMIN` szerepkörű felhasználóknak elérhető.

### Oldalsáv navigáció struktúrája

A bal oldali `SidebarNav` a bejelentkezett felhasználó szerepköre (`role`) alapján szűri a látható menüpontokat. A csoportok és az elérhetőség:

| Csoport | Menüpont | URL | SHELTER_ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| *(főoldal)* | Áttekintés | `/dashboard` | ✅ | ✅ |
| **Állatok** | Állatok | `/dashboard/animals` | ✅ | ✅ |
| | Kennelkiosztás | `/dashboard/kennels` | ✅ | – |
| | Etetési napló | `/dashboard/feeding` | ✅ | ✅ |
| | Készlet | `/dashboard/inventory` | ✅ | ✅ |
| | Átadások | `/dashboard/transfers` | ✅ | ✅ |
| **Örökbefogadás** | Kérelmek | `/dashboard/applications` | ✅ | ✅ |
| | Időpontok | `/dashboard/appointments` | ✅ | ✅ |
| | Utánkövetés | `/dashboard/followups` | ✅ | ✅ |
| | Kérdőívek | `/dashboard/forms` | ✅ | – |
| **Közösség** | Posztok | `/dashboard/posts` | ✅ | ✅ |
| | Önkéntesek | `/dashboard/volunteers` | ✅ | ✅ |
| | Nevelőcsaládok | `/dashboard/foster` | ✅ | ✅ |
| | Események | `/dashboard/events` | ✅ | ✅ |
| | Üzenetek | `/dashboard/messages` | ✅ | ✅ |
| **Adományozás** | Előfizetési csomagok | `/dashboard/tiers` | ✅ | ✅ (csak olvasás) |
| | Gyűjtések | `/dashboard/campaigns` | – | ✅ |
| | Előfizetések | `/dashboard/subscriptions` | ✅ | ✅ |
| **Platform** | Menhelyek | `/dashboard/shelters` | – | ✅ |
| | Felhasználók | `/dashboard/users` | – | ✅ |
| **Beállítások** | Profil admin | `/profile/admin` | ✅ | ✅ |
| | Menhely beállítások | `/dashboard/settings` | ✅ | – |

---

## Felhasználói Történetek

- **US-11-A**: Mint menhely adminisztrátor, szeretném az összes fontos mutatót egy helyen látni, hogy gyorsan áttekinthessem a menhely állapotát.
- **US-11-B**: Mint menhely adminisztrátor, szeretnék új állatot hozzáadni és kezelni, hogy naprakész legyen az állatállomány nyilvántartása.
- **US-11-C**: Mint menhely adminisztrátor, szeretném elbírálni az örökbefogadási kérelmeket, hogy szervezett legyen az örökbeadási folyamat.
- **US-11-D**: Mint menhely adminisztrátor, szeretném a menhely készletét nyilvántartani és mozgásokat rögzíteni, hogy soha ne fogyjon el az ellátmány.
- **US-11-E**: Mint menhely adminisztrátor, szeretnék értesítést kapni, ha egy tétel az minimum szint alá süllyed.
- **US-11-F**: Mint menhely adminisztrátor, szeretnék posztokat közzétenni a menhelyem nevében (szöveg, kép, csatolt állat/esemény/gyűjtés), hogy a látogatók a főoldalon egy „Neked" (For You) feedben értesüljenek a legfrissebb hírekről.

---

## Tesztesetek

---

### TC-11-01: Dashboard főoldal betöltése (KPI kártyák, analytics panelek)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!` admin; a menhely rendelkezik seed adatokkal (állatok, kérelmek, előfizetések) |
| **URL** | `/dashboard` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül nem érhető el – átirányít bejelentkezésre
- [ ] `USER` szerepkörű felhasználó nem érheti el – átirányít
- [ ] A KPI kártyák megjelennek: összes állat, elérhető állatok, beérkező kérelmek, aktív előfizetések
- [ ] A KPI kártyák valós adatokat mutatnak (nem nullák, ha van seed adat)
- [ ] Az `AnimalsDonut` (állatállomány státusz megoszlása) diagram megjelenik
- [ ] Az `ApplicationsBar` (kérelmek státusz szerinti bontása) diagram megjelenik
- [ ] Az `AdoptionsLine` (örökbefogadási trend) diagram megjelenik
- [ ] A `AnalyticsSection` panel betölt
- [ ] A legutóbbi kérelmek és örökbefogadások listája megjelenik
- [ ] Az oldal 3 másodpercen belül betölt

**Tesztelési lépések:**
1. Navigálj a `/dashboard` URL-re kijelentkezve – ellenőrizd az átirányítást.
2. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal.
3. Navigálj a `/dashboard` oldalra.
4. Ellenőrizd, hogy a KPI kártyák megjelennek helyes értékekkel (nem 0, ha van seed adat).
5. Ellenőrizd az `AnimalsDonut` diagramot – megjelenik a státuszok (AVAILABLE, PENDING, ADOPTED stb.) megoszlása.
6. Ellenőrizd az `ApplicationsBar` diagramot – kérelmek PENDING/REVIEWING/APPROVED/REJECTED bontásban.
7. Ellenőrizd az `AdoptionsLine` diagramot – havi örökbefogadási trend.
8. Ellenőrizd, hogy az `AnalyticsSection` panel betölt analytics adatokkal.
9. Ellenőrizd a legutóbbi kérelmek listáját az oldal alján.

**Elvárt eredmény:**
A dashboard főoldal betölt az összes KPI kártyával és analytics diagrammal. Az adatok a seed adatbázis tartalmát tükrözik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-02: Új állat hozzáadása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; a menhely legalább egy aktív menhely |
| **URL** | `/dashboard/animals` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Új állat" / „Hozzáadás" gomb elérhető az állatlistán (`AddAnimalPanel` komponens)
- [ ] A form tartalmaz: Faj (DOG/CAT/RABBIT/BIRD/OTHER), Név, Kor (év), Nem, Méret, Leírás, Fotó feltöltés
- [ ] Kötelező mezők: Faj, Név
- [ ] Sikeres mentés után az állat `AVAILABLE` státusszal jön létre
- [ ] Az új állat megjelenik az állatlistában
- [ ] Az új állat megjelenik a nyilvános `/hu/animals` oldalon is
- [ ] Fotó feltöltésekor az kép mentésre kerül és megjelenik az állat kártyáján
- [ ] Hiányzó kötelező mező esetén hibaüzenet jelenik meg

**Tesztelési lépések:**
1. Navigálj a `/dashboard/animals` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Kattints az „Új állat" / „Hozzáadás" gombra.
3. Töltsd ki a form mezőit:
   - Faj: `DOG` (Kutya)
   - Név: `Bodri Teszt`
   - Kor: `3`
   - Nem: `Hím`
   - Méret: `Közepes`
   - Leírás: `Barátságos keverék kutya, jól elvan más állatokkal.`
4. Töltj fel egy teszt fotót.
5. Kattints a „Mentés" / „Hozzáadás" gombra.
6. Ellenőrizd, hogy az állat megjelenik az állatlistában `AVAILABLE` státusszal.
7. Navigálj a `/hu/animals` nyilvános oldalra – ellenőrizd, hogy „Bodri Teszt" megjelenik.
8. Kíséreld meg az állatot üres névvel hozzáadni – ellenőrizd a hibaüzenetet.

**Elvárt eredmény:**
Az `Animal` rekord `AVAILABLE` státusszal jön létre. Az állat megjelenik a dashboard állatlistájában és a nyilvános `/hu/animals` oldalon.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-03: Állat státuszának módosítása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik `AVAILABLE` státuszú állat (TC-11-02 lefutott vagy seed adat) |
| **URL** | `/dashboard/animals` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Minden állatnál megjelenik az `AnimalStatusSelect` komponens (státusz legördülő)
- [ ] Elérhető státuszok: `AVAILABLE`, `PENDING`, `ADOPTED`, `FOSTER`, `MEDICAL_HOLD`
- [ ] Státusz megváltoztatásakor az adatbázis frissül
- [ ] `ADOPTED` státuszra váltáskor az `adoptedAt` mező kitöltésre kerül
- [ ] A státuszváltás megjelenik az állatlistán (a badge azonnal frissül)
- [ ] A nyilvános `/hu/animals` oldalon az `ADOPTED` állat eltűnik az elérhető állatok közül

**Tesztelési lépések:**
1. Navigálj a `/dashboard/animals` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg a „Bodri Teszt" (vagy más `AVAILABLE`) állatot.
3. Kattints a státusz legördülőre (`AnimalStatusSelect`).
4. Változtasd a státuszt `PENDING`-re – ellenőrizd, hogy a badge frissül (sárga „Folyamatban").
5. Változtasd a státuszt `ADOPTED`-re – ellenőrizd, hogy a badge frissül (kék „Örökbefogadott").
6. Navigálj a `/hu/animals` nyilvános oldalra – ellenőrizd, hogy „Bodri Teszt" nem jelenik meg az elérhető állatok között.
7. Navigálj a `/dashboard/animals` oldalra és változtasd vissza `AVAILABLE`-re.
8. Ellenőrizd, hogy a `/hu/animals` oldalon újra megjelenik.

**Elvárt eredmény:**
Az állat státusza sikeresen vált, az adatbázis frissül. `ADOPTED` státusznál az állat eltűnik a nyilvános listából. A státuszváltás azonnali vizuális visszajelzést ad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-04: Egészségügyi bejegyzés hozzáadása állathoz

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik legalább egy állat a menhelyen |
| **URL** | `/dashboard/animals/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állat részletes dashboard oldalán megjelenik az egészségügyi napló szekció
- [ ] Az „Új bejegyzés" / „Napló hozzáadása" gombra kattintva form nyílik
- [ ] A form mezői: bejegyzés típusa (pl. oltás, kezelés, vizsgálat), dátum, megjegyzés
- [ ] Sikeres mentés után a napló bejegyzés megjelenik az állat egészségügyi naplójában
- [ ] A bejegyzések fordított kronológiai sorrendben listázódnak (legutóbbi felül)
- [ ] Hiányzó kötelező mező esetén hibaüzenet jelenik meg

**Tesztelési lépések:**
1. Navigálj a `/dashboard/animals` oldalra és kattints egy állatra a részletek megnyitásához.
2. Keresd meg az egészségügyi napló szekciót.
3. Kattints az „Új bejegyzés" gombra.
4. Töltsd ki a mezőket:
   - Típus: `Oltás` / `Vakcina`
   - Dátum: mai dátum (2026-06-09)
   - Megjegyzés: `Veszettség elleni oltás beadva.`
5. Kattints a „Mentés" gombra.
6. Ellenőrizd, hogy a bejegyzés megjelenik az egészségügyi naplóban a helyes dátummal és szöveggel.
7. Adj hozzá egy másik bejegyzést korábbi dátummal – ellenőrizd a sorrendet (legutóbbi felül).

**Elvárt eredmény:**
Az egészségügyi napló bejegyzés (`HealthLog` vagy hasonló rekord) létrejön az adatbázisban. A naplóban fordított kronológiai sorrendben jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-05: Beérkező kérelmek listája

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; legalább 3 kérelem létezik a menhelyhez különböző státuszokkal |
| **URL** | `/dashboard/applications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal betölt és listázza a menhely állataihoz beérkező örökbefogadási kérelmeket
- [ ] Minden kérelem-soron látható: kérelmező neve és e-mail-je, az állat neve és fotója, a kérelem dátuma, státusz badge
- [ ] Státusz szűrők elérhetők: PENDING, REVIEWING, APPROVED, REJECTED, INVITED, WITHDRAWN
- [ ] Szűrő aktiválásával az URL frissül (`?status=PENDING`) és csak az adott státuszú kérelmek láthatók
- [ ] A kérelem sorára kattintva a részletes kérelem-oldalra (`/dashboard/applications/[id]`) navigál
- [ ] Az „Exportálás" gomb elérhető (`ExportButton` komponens) és CSV/Excel formátumban letölthető

**Tesztelési lépések:**
1. Navigálj a `/dashboard/applications` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd, hogy az összes kérelem listázódik.
3. Ellenőrizd a kérelem-sorok tartalmát: kérelmező neve, állat neve, státusz.
4. Kattints a „PENDING" státusz szűrőre – ellenőrizd, hogy csak várakozó kérelmek jelennek meg.
5. Kattints a „REVIEWING" szűrőre – ellenőrizd az URL frissülését és a szűrt listát.
6. Kattints vissza az összes kérelemre.
7. Kattints egy kérelem sorára – ellenőrizd, hogy a `/dashboard/applications/[id]` oldalra navigál.
8. Navigálj vissza és teszteld az „Exportálás" gombot – ellenőrizd, hogy fájl letöltés indul.

**Elvárt eredmény:**
A kérelmek listája betölt, a szűrők funkcionálnak, a kérelem részletes oldal elérhető. Az exportálás funkcionál.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-06: Kérelem jóváhagyása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik `PENDING` státuszú kérelem; a kérelmező (`user@test.hu`) értesítést kap |
| **URL** | `/dashboard/applications/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A kérelem részletes oldalán megjelenik az `ApplicationReview` komponens
- [ ] Látható a kérelmező adatai (név, e-mail, telefon, cím)
- [ ] Az „Elfogad" / „Jóváhagyás" gomb elérhető
- [ ] Jóváhagyás után a kérelem státusza `APPROVED`-ra vált
- [ ] Az állat státusza automatikusan `PENDING`-re vált (ha volt `AVAILABLE`)
- [ ] A kérelmező értesítést kap a jóváhagyásról (notification rekord jön létre)
- [ ] Az admin megadhat megjegyzést / üzenetet a döntéshez
- [ ] A jóváhagyott kérelem megjelenik az `APPROVED` szűrőben

**Tesztelési lépések:**
1. Navigálj a `/dashboard/applications` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Kattints egy `PENDING` státuszú kérelemre.
3. Ellenőrizd, hogy a kérelmező adatai megjelennek (neve, e-mail-je, esetleg a kitöltött kérdőív).
4. Opcionálisan írj megjegyzést: `Örömmel fogadjuk örökbeadónak!`
5. Kattints az „Elfogad" / „Jóváhagyás" gombra.
6. Ellenőrizd, hogy a státusz `APPROVED`-ra vált (zöld badge).
7. Navigálj a `/dashboard/animals` oldalra – ellenőrizd, hogy az érintett állat státusza `PENDING`-re változott.
8. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és ellenőrizd, hogy értesítés érkezett a jóváhagyásról.

**Elvárt eredmény:**
A kérelem `APPROVED` státuszra vált, az állat `PENDING` státuszra vált, és a kérelmező értesítést kap.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-07: Kérelem elutasítása indoklással

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik `PENDING` vagy `REVIEWING` státuszú kérelem |
| **URL** | `/dashboard/applications/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Elutasít" / „Visszautasítás" gomb elérhető a kérelem részletes oldalán
- [ ] Elutasítás előtt indoklás / megjegyzés megadható (nem kötelező, de javasolt)
- [ ] Elutasítás után a kérelem státusza `REJECTED`-re vált
- [ ] Az állat státusza visszaáll `AVAILABLE`-re
- [ ] A kérelmező értesítést kap az elutasításról (a megjegyzéssel együtt, ha volt)
- [ ] Az elutasított kérelem megjelenik a `REJECTED` szűrőben

**Tesztelési lépések:**
1. Navigálj a `/dashboard/applications/[id]` oldalra (egy `PENDING` kérelem) bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Add meg az indoklást: `Sajnos a lakáskörülmények nem megfelelőek a kiválasztott állat számára.`
3. Kattints az „Elutasít" / „Visszautasítás" gombra.
4. Ellenőrizd, hogy megerősítő dialógus jelenik meg.
5. Erősítsd meg az elutasítást.
6. Ellenőrizd, hogy a kérelem státusza `REJECTED`-re vált (piros badge).
7. Navigálj a `/dashboard/animals` oldalra – ellenőrizd, hogy az állat státusza visszaállt `AVAILABLE`-re.
8. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és ellenőrizd, hogy értesítés érkezett az elutasításról az indoklással.

**Elvárt eredmény:**
A kérelem `REJECTED` státuszra vált, az állat `AVAILABLE` státuszra vált vissza, a kérelmező értesítést kap az indoklással.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-08: Készlet tétel hozzáadása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!` |
| **URL** | `/dashboard/inventory/new` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Új tétel" / „Hozzáadás" gomb elérhető a `/dashboard/inventory` oldalon
- [ ] A form tartalmaz: Név (kötelező), Kategória (FOOD/MEDICINE/SUPPLIES/CLEANING/EQUIPMENT/OTHER), Egység (kötelező, pl. kg, db, liter), Mennyiség (kötelező, ≥ 0), Minimum mennyiség (opcionális)
- [ ] Sikeres mentés után az `InventoryItem` rekord létrejön
- [ ] Az új tétel megjelenik a készletlistában a helyes adatokkal
- [ ] Ha a kezdeti mennyiség kisebb, mint a minimum, az alacsony készlet badge azonnal megjelenik
- [ ] Hiányzó kötelező mező esetén hibaüzenet jelenik meg

**Tesztelési lépések:**
1. Navigálj a `/dashboard/inventory` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Kattints az „Új tétel" / „Hozzáadás" gombra (vagy navigálj a `/dashboard/inventory/new` oldalra).
3. Töltsd ki a form mezőit:
   - Név: `Prémium kutya táp`
   - Kategória: `FOOD` (Takarmány)
   - Egység: `kg`
   - Mennyiség: `50`
   - Minimum mennyiség: `10`
4. Kattints a „Mentés" / „Hozzáadás" gombra.
5. Ellenőrizd, hogy az új tétel megjelenik a készletlistában.
6. Ellenőrizd, hogy a mennyiség (50 kg) és a minimum (10 kg) helyesen jelenik meg.
7. Próbálj meg tételt hozzáadni üres névvel – ellenőrizd a hibaüzenetet.

**Elvárt eredmény:**
Az `InventoryItem` rekord létrejön a helyes adatokkal. A tétel megjelenik a készletlistában. Hiányos form esetén hibaüzenet jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-09: Bevételezés rögzítése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik legalább egy `InventoryItem` (TC-11-08 lefutott vagy seed adat); a tétel aktuális mennyisége ismert |
| **URL** | `/dashboard/inventory/[id]` vagy `/dashboard/inventory` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az `InventoryItemDetail` vagy `TransactionModal` komponensben elérhető a „Bevételezés" / `IN` mozgás rögzítése
- [ ] A form mezői: mennyiség (pozitív egész vagy tört szám), megjegyzés (opcionális)
- [ ] Sikeres mentés után az `InventoryTransaction` rekord `IN` típussal jön létre
- [ ] A tétel aktuális mennyisége megnő a bevételezett mennyiséggel
- [ ] A tranzakció megjelenik a mozgási naplóban a helyes típussal, mennyiséggel és dátummal
- [ ] Ha az új mennyiség meghaladja a minimumot, az alacsony készlet badge eltűnik

**Tesztelési lépések:**
1. Navigálj a `/dashboard/inventory` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Jegyezd meg a „Prémium kutya táp" aktuális mennyiségét (pl. 50 kg).
3. Kattints a tételre a részletes nézet megnyitásához vagy a `TransactionModal`-t nyitó gombra.
4. Válaszd a „Bevételezés" / `IN` típusú mozgást.
5. Add meg a mennyiséget: `20`.
6. Opcionálisan add meg a megjegyzést: `Hetilap szállítás`.
7. Kattints a „Mentés" / „Rögzítés" gombra.
8. Ellenőrizd, hogy az aktuális mennyiség 70 kg-ra nőtt (50 + 20).
9. Ellenőrizd, hogy a tranzakció megjelenik a mozgási naplóban: `IN`, `20 kg`, mai dátum.

**Elvárt eredmény:**
A készlet mennyisége a bevételezett értékkel megnő. Az `InventoryTransaction` `IN` rekord létrejön a helyes adatokkal.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-10: Felhasználás rögzítése (OUT mozgás, negatív egyenleg ellenőrzés)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik `InventoryItem` ismert mennyiséggel (pl. 70 kg, TC-11-09 után) |
| **URL** | `/dashboard/inventory/[id]` vagy `/dashboard/inventory` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Felhasználás" / `OUT` mozgás rögzítése elérhető
- [ ] A form mezői: mennyiség (pozitív szám), megjegyzés (opcionális)
- [ ] Sikeres mentés után a tétel mennyisége csökken a felhasznált értékkel
- [ ] Az `InventoryTransaction` rekord `OUT` típussal jön létre
- [ ] Ha a felhasznált mennyiség meghaladja az aktuális készletet, a rendszer hibaüzenetet jelenít meg (nem lehet negatív az egyenleg)
- [ ] A tranzakció megjelenik a mozgási naplóban

**Tesztelési lépések:**
1. Navigálj a `/dashboard/inventory` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Nyisd meg a „Prémium kutya táp" tételt (aktuális mennyiség: 70 kg).
3. Válaszd a „Felhasználás" / `OUT` típusú mozgást.
4. Add meg a mennyiséget: `15`.
5. Megjegyzés: `Napi etetés`.
6. Kattints a „Mentés" gombra.
7. Ellenőrizd, hogy az aktuális mennyiség 55 kg-ra csökkent (70 - 15).
8. Próbálj meg olyan mennyiséget kiadni, ami meghaladja az aktuális készletet: add meg `100`-at.
9. Ellenőrizd, hogy hibaüzenet jelenik meg: „Nincs elegendő készlet" vagy hasonló.
10. Ellenőrizd, hogy a mennyiség változatlan maradt 55 kg-on.

**Elvárt eredmény:**
A felhasználás rögzítve, a mennyiség csökken. Negatív egyenleget eredményező kiadás esetén hibaüzenet jelenik meg és a mennyiség változatlan marad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-11: Alacsony készlet riasztás megjelenése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; létezik `InventoryItem`, amelynek mennyisége a minimum szint alá süllyed (TC-11-10 után, vagy seed adat) |
| **URL** | `/dashboard` és `/dashboard/inventory` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Ha egy tétel mennyisége az előre beállított minimum alá kerül, vizuális riasztás jelenik meg
- [ ] A `/dashboard/inventory` oldalon az alacsony készletű tételek kiemelten megjelennek (piros / sárga badge)
- [ ] A dashboard főoldalán (`/dashboard`) a KPI kártyák között megjelenik az alacsony készlet számláló badge
- [ ] A riasztás megjelenik az `AlertTriangle` ikon vagy hasonló vizuális indikátorral
- [ ] A riasztás eltűnik, ha a bevételezés után a mennyiség ismét a minimum fölé emelkedik

**Tesztelési lépések:**
1. Navigálj a `/dashboard/inventory` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Keresd meg azt a tételt, amelynek mennyisége a minimum alá csökkent (pl. ha a min = 10 és a jelenlegi mennyiség < 10).
3. Ellenőrizd, hogy az alacsony készlet badge / riasztás ikonra megjelenik a tétel sorában.
4. Navigálj a `/dashboard` főoldalra és ellenőrizd, hogy az „Alacsony készlet" KPI kártyán a riasztás látható.
5. Rögzíts bevételezést a tételre, amellyel a mennyiség a minimum fölé kerül.
6. Ellenőrizd, hogy a riasztás eltűnik mind a tétel sorában, mind a dashboard KPI kártyán.

**Elvárt eredmény:**
Az alacsony készlet riasztás megjelenik a dashboard-on és a készletlistában, ha a mennyiség a minimum alá kerül. Bevételezés után eltűnik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-12: Analytics panel betöltése – örökbefogadási trend diagram

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!`; az adatbázisban legalább 3 hónapra visszamenőleg vannak örökbefogadási adatok (seed adat) |
| **URL** | `/dashboard` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az `AnalyticsSection` panel betölt a dashboard főoldalán
- [ ] Az `AdoptionsLine` diagram megjelenik vonaldiagramként
- [ ] A diagram X tengelye hónapokat mutat (legalább 3-6 hónap visszamenőleg)
- [ ] A diagram Y tengelye az örökbefogadások számát mutatja
- [ ] Az adatpontok a tényleges adatbázis-adatokat tükrözik
- [ ] A diagram interaktív (hover esetén tooltip jelenik meg az adott hónap értékével)
- [ ] Ha nincs elég adat, a diagram üres állapotot jelenít meg (nem törik el)

**Tesztelési lépések:**
1. Navigálj a `/dashboard` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Görgess le az analytics szekciókig.
3. Ellenőrizd, hogy az `AdoptionsLine` vonaldiagram megjelenik.
4. Ellenőrizd, hogy az X tengely hónapokat mutat (pl. „Jan", „Feb", „Már", „Ápr").
5. Ellenőrizd, hogy az Y tengely számokat mutat (örökbefogadások száma).
6. Vidd az egeret egy adatpont fölé – ellenőrizd, hogy tooltip jelenik meg (pl. „Március: 5 örökbefogadás").
7. Ellenőrizd, hogy az `AnimalsDonut` diagram is betölt (állatok státusz-megoszlása körcikk diagramon).
8. Ellenőrizd, hogy az `ApplicationsBar` diagram betölt (kérelmek státusz szerinti oszlopdiagram).

**Elvárt eredmény:**
Az analytics diagramok betöltenek, az adatok a tényleges adatbázis-adatokat tükrözik. Az interaktív tooltipek funkcionálnak. Üres adatok esetén a diagramok nem törnek el.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-13: Oldalsáv navigáció – csoportok és szerepkör-szűrés ellenőrzése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!` (SHELTER_ADMIN); külön ellenőrzés `admin@test.hu` / `Admin1234!` (SUPER_ADMIN) fiókkal |
| **URL** | `/dashboard` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek (SHELTER_ADMIN):**
- [ ] Megjelennek a csoportok: Állatok, Örökbefogadás, Közösség, Adományozás, Beállítások
- [ ] A Közösség csoportban megjelenik: Posztok, Önkéntesek, Nevelőcsaládok, Események, Üzenetek
- [ ] Az Adományozás csoportban megjelenik: Előfizetési csomagok, Előfizetések
- [ ] NEM jelenik meg: Gyűjtések (Adományozás csoportban) – ez SUPER_ADMIN exkluzív
- [ ] NEM jelenik meg: Platform csoport (Menhelyek, Felhasználók)
- [ ] Megjelenik: Menhely beállítások (Beállítások csoportban)

**Elfogadási feltételek (SUPER_ADMIN):**
- [ ] Az Adományozás csoportban megjelenik: Előfizetési csomagok, Gyűjtések, Előfizetések
- [ ] A Platform csoport megjelenik: Menhelyek, Felhasználók
- [ ] NEM jelenik meg: Kennelkiosztás, Kérdőívek, Menhely beállítások

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal.
2. Ellenőrizd az oldalsáv csoport-struktúráját a fenti táblázat szerint.
3. Ellenőrizd, hogy a Platform csoport (Menhelyek, Felhasználók) NEM látható.
4. Ellenőrizd, hogy Gyűjtések menüpont NEM látható.
5. Kijelentkezés, majd bejelentkezés `admin@test.hu` / `Admin1234!` fiókkal.
6. Ellenőrizd, hogy a Platform csoport (Menhelyek, Felhasználók) LÁTHATÓ.
7. Ellenőrizd, hogy Gyűjtések menüpont LÁTHATÓ az Adományozás csoportban.
8. Ellenőrizd, hogy Kennelkiosztás és Kérdőívek NEM láthatók.
9. Ellenőrizd, hogy Menhely beállítások NEM látható.

**Elvárt eredmény:**
A sidebar minden szerepkörnél pontosan a jogosult menüpontokat jeleníti meg. Sem felesleges, sem hiányzó elem nincs.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-11-14: Közösségi poszt létrehozása menhely admin által

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett `shelter@test.hu` / `Admin1234!` (SHELTER_ADMIN); a menhely legalább egy állattal, eseménnyel vagy gyűjtéssel rendelkezik |
| **URL** | `/dashboard/posts` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/posts` oldal betölt a `PostComposer` szerkesztőfelülettel és a menhely korábbi posztjainak listájával
- [ ] A szerkesztőben kötelező mező: szöveges tartalom (textarea)
- [ ] Opcionálisan feltölthető kép (`ImageUpload` komponens)
- [ ] Opcionálisan csatolható entitás: állat, esemény vagy gyűjtés (select legördülő)
- [ ] Sikeres mentés után a poszt megjelenik a listában és a publikus főoldalon (For You feed)
- [ ] A poszt tartalmazza: a menhely profilképét és nevét, a közzététel idejét, a szöveget, a képet (ha van), a csatolt entitás kártyáját (ha van)
- [ ] A poszt törölhető a `DeletePostButton` segítségével (megerősítő dialógussal)
- [ ] `USER` szerepkörű felhasználó nem érheti el a `/dashboard/posts` oldalt

**Tesztelési lépések:**
1. Navigálj a `/dashboard/posts` oldalra bejelentkezve `shelter@test.hu` / `Admin1234!` fiókkal.
2. Töltsd ki a szöveges mezőt: `Ez egy teszt közösségi poszt a menhely nevében.`
3. Tölts fel egy teszt képet.
4. A csatolás legördülőből válassz ki egy állatot.
5. Kattints a „Közzétesz" gombra.
6. Ellenőrizd, hogy a poszt megjelenik a listában.
7. Navigálj a publikus főoldalra (`/hu`) – ellenőrizd, hogy a poszt megjelenik a „Neked" feedben.
8. Navigálj vissza a `/dashboard/posts` oldalra és kattints a „Törlés" gombra.
9. Erősítsd meg a törlést – ellenőrizd, hogy a poszt eltűnik a listából és a feedből.
10. Kijelentkezés, majd bejelentkezés `user@test.hu` / `User1234!` fiókkal – navigálj a `/dashboard/posts` oldalra.
11. Ellenőrizd, hogy átirányítás történik (nem elérhető `USER` számára).

**Elvárt eredmény:**
A poszt sikeresen létrejön, megjelenik a publikus főoldalon. A törlés funkcionál. `USER` szerepkörű felhasználó nem érheti el a szerkesztőfelületet.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
