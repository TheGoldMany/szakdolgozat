# 17 – Menhely beállítások és támogatói szintek

## Összefoglalás

Ez a modul a menhely admin felület beállítási és bevétel-kezelési funkcióit fedi le. A `/dashboard/settings` oldalon a menhely admin a `ShelterSettingsForm` komponensen keresztül kezeli a menhely logóját, kapacitását, örökbefogadási feltételeit, számlázási adatait (cégnév, adószám, bankszámla) és dokumentumait, valamint innen indítható a **Stripe Connect** onboarding (`POST /api/stripe/connect/onboard`), amellyel az adományok és előfizetési díjak közvetlenül a menhely Stripe Express számlájára érkeznek (4% platformdíjjal). A `/dashboard/tiers` oldalon a `TiersManager` komponenssel havi támogatói szintek (`DonationTier`) hozhatók létre és szerkeszthetők (minimum 175 Ft – Stripe limit); az aktív csomagok a publikus `/hu/donate` és `/hu/shelters/[slug]` oldalakon `TierCard`-ként jelennek meg „Feliratkozás" gombbal, amely Stripe Checkout fizetésre visz (`POST /api/checkout/subscribe`). Az előfizetések (`Subscription`, státuszok: `ACTIVE`, `CANCELLED`, `PAST_DUE`) a `/dashboard/subscriptions` oldalon listázhatók, szűrhetők és admin által lemondhatók (`POST /api/subscriptions/[id]/admin-cancel`).

---

## Felhasználói Történetek

- **US-17-A**: Mint menhely admin, szeretném a menhelyem profilját (logó, kapacitás, örökbefogadási feltételek, dokumentumok) karbantartani, hogy a látogatók naprakész információkat lássanak a publikus oldalon.
- **US-17-B**: Mint menhely admin, szeretném a számlázási adatainkat (cégnév, adószám, bankszámlaszám) rögzíteni, hogy a pénzügyi folyamatok szabályosan működjenek.
- **US-17-C**: Mint menhely admin, szeretném a Stripe fiókomat csatlakoztatni a platformhoz, hogy az adományok és előfizetési díjak automatikusan a számlánkra érkezzenek.
- **US-17-D**: Mint menhely admin, szeretnék havi támogatói szinteket létrehozni és árazni, hogy a támogatók rendszeres adományokkal segíthessék a menhelyet.
- **US-17-E**: Mint támogató felhasználó, szeretnék egy támogatói szintre feliratkozni bankkártyával, hogy havonta automatikusan támogassam a kiválasztott menhelyet.
- **US-17-F**: Mint menhely admin, szeretném látni az előfizetőim listáját és szükség esetén lemondani egy előfizetést, hogy átlássam és kezelni tudjam a rendszeres bevételeket.

---

## Tesztesetek

---

### TC-17-01: Menhely profiladatok szerkesztése (logó, kapacitás, örökbefogadási feltételek)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN), a fiók menhelyhez rendelt |
| **URL** | `/dashboard/settings` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Menhely beállítások" oldal betölt a menhely nevével és a „Publikus oldal megtekintése" linkkel (új lapon nyitja a `/shelters/[slug]` oldalt)
- [ ] Menhelyhez nem rendelt fióknál „Nincs hozzárendelt menhelyed." üzenet jelenik meg
- [ ] A logó feltöltése (kamera ikon) Vercel Blob-ra tölt, majd `PATCH /api/shelters/[id]/logo` hívással menti; az előnézet azonnal frissül
- [ ] A kapacitás mező mentése (`PATCH /api/shelters/[id]/capacity`) csak pozitív egész számot fogad el – érvénytelen értéknél hibaüzenet jelenik meg, a mentés elmarad
- [ ] Az örökbefogadási feltételek szövegmező mentése (`PATCH /api/shelters/[id]/requirements`) után visszaigazoló jelzés látható
- [ ] A mentett adatok oldal-újratöltés után is megmaradnak
- [ ] A módosított logó és örökbefogadási feltételek a publikus menhelyoldalon (`/hu/shelters/[slug]`) is megjelennek

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/settings` oldalra.
2. Ellenőrizd az oldal címét, a menhely nevét és a „Publikus oldal megtekintése" linket.
3. Tölts fel új logót a kamera ikonnal – ellenőrizd az előnézet frissülését és a feltöltés sikerességét.
4. Írd át a kapacitás mezőt érvénytelen értékre (pl. `-5` vagy `abc`), és mentsd – ellenőrizd a hibaüzenetet.
5. Állítsd a kapacitást érvényes értékre (pl. `50`), és mentsd – ellenőrizd a sikeres mentés jelzését.
6. Módosítsd az örökbefogadási feltételek szövegét (pl. „Előzetes egyeztetés szükséges…"), és mentsd.
7. Töltsd újra az oldalt – ellenőrizd, hogy a logó, a kapacitás és a feltételek a mentett értékeket mutatják.
8. Nyisd meg a publikus menhelyoldalt a „Publikus oldal megtekintése" linkkel – ellenőrizd, hogy az új logó és a feltételek ott is láthatók.

**Elvárt eredmény:**
A logó, a kapacitás és az örökbefogadási feltételek külön-külön menthetők, a validáció érvénytelen kapacitást elutasít. A módosítások perzisztensek és a publikus oldalon is megjelennek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-17-02: Számlázási adatok és menhelyi dokumentumok kezelése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN) |
| **URL** | `/dashboard/settings` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A számlázási adatok szekcióban kitölthető: cégnév (`companyName`), adószám (`taxNumber`), bankszámla-tulajdonos (`bankAccountName`), bankszámlaszám (`bankAccountNumber`)
- [ ] A mentés `PATCH /api/shelters/[id]/payment-info` hívással történik, sikeres mentésnél visszaigazoló jelzés látható (pár másodpercig)
- [ ] A dokumentum-feltöltéshez először a dokumentum nevét kell megadni – név nélkül „Add meg a dokumentum nevét először." hibaüzenet jelenik meg
- [ ] A fájl Vercel Blob-ra töltődik, majd `POST /api/shelters/[id]/documents` hívással rögzül; az új dokumentum azonnal megjelenik a listában
- [ ] A dokumentum törölhető (`DELETE /api/shelters/[id]/documents/[docId]`), a sor eltűnik a listából
- [ ] A számlázási adatok és a dokumentumlista oldal-újratöltés után is a mentett állapotot mutatják

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/settings` oldalra.
2. Töltsd ki a számlázási adatokat (pl. cégnév: „Teszt Menhely Alapítvány", adószám: „12345678-1-42", bankszámla adatok).
3. Mentsd a számlázási adatokat – ellenőrizd a sikeres mentés visszajelzését.
4. A dokumentum szekcióban próbálj fájlt feltölteni névmegadás nélkül – ellenőrizd a hibaüzenetet.
5. Add meg a dokumentum nevét (pl. „Alapító okirat"), és tölts fel egy PDF tesztfájlt.
6. Ellenőrizd, hogy a dokumentum megjelenik a listában a nevével.
7. Töltsd újra az oldalt – ellenőrizd, hogy a számlázási adatok és a dokumentum megmaradtak.
8. Töröld a feltöltött dokumentumot a kuka ikonnal – ellenőrizd, hogy eltűnik a listából, és újratöltés után sem jelenik meg.

**Elvárt eredmény:**
A számlázási adatok menthetők és perzisztensek. Dokumentum csak névvel tölthető fel, a feltöltött fájl listázódik és törölhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-17-03: Stripe Connect onboarding indítása és állapotjelzés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN); Stripe teszt-kulcsok konfigurálva (`STRIPE_SECRET_KEY` teszt mód) |
| **URL** | `/dashboard/settings` (Stripe Connect szekció) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A Stripe Connect szekció leírása említi a 4% platformdíjat
- [ ] Ha a menhelynek nincs Stripe fiókja, a „Stripe fiók csatlakoztatása" gomb látható
- [ ] A gombra kattintva `POST /api/stripe/connect/onboard` (`{ type: "shelter", shelterId }`) Stripe Express fiókot hoz létre (country: `HU`), és a böngésző a Stripe onboarding URL-re irányít
- [ ] A menhely `stripeAccountId` mezője kitöltődik, `stripeOnboardingComplete: false` értékkel
- [ ] Megszakított/befejezetlen onboarding után a szekció sárga figyelmeztetést mutat: „Az onboarding nem teljes. Kattints a gombra a folytatáshoz." – a gomb újraindítja a folyamatot
- [ ] Az onboarding befejezése után a Stripe a `/api/stripe/connect/callback` címre irányít vissza, amely `details_submitted` esetén `stripeOnboardingComplete: true`-ra állítja a menhelyet, és a `/dashboard/settings?stripe=success` oldalra irányít
- [ ] Befejezett onboardingnál zöld jelzés látható: „Stripe fiók aktív – az adományok automatikusan érkeznek a számládra."
- [ ] Az onboarding gomb csak a saját menhelyre hívható (más menhely `shelterId`-jával: `403`)

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/settings` oldalra.
2. Keresd meg a „Stripe Connect" szekciót – ellenőrizd a 4% platformdíjat említő leírást és az aktuális állapotjelzést.
3. Kattints a „Stripe fiók csatlakoztatása" gombra – ellenőrizd az „Átirányítás..." állapotot, majd a Stripe onboarding oldal betöltését.
4. Szakítsd meg a folyamatot (zárd be / navigálj vissza a `/dashboard/settings` oldalra).
5. Ellenőrizd, hogy a szekció most sárga „Az onboarding nem teljes…" figyelmeztetést mutat folytatás gombbal.
6. Indítsd újra az onboardingot, és töltsd ki a Stripe teszt űrlapot (teszt módban a Stripe kitöltési segédet kínál; bankkártya-adatnak használható a `4242 4242 4242 4242` teszt kártya, ahol kéri).
7. Fejezd be az onboardingot – ellenőrizd a visszairányítást a `/dashboard/settings?stripe=success` URL-re.
8. Ellenőrizd, hogy a szekció zöld „Stripe fiók aktív…" állapotot mutat.
9. Töltsd újra az oldalt – ellenőrizd, hogy az aktív állapot megmaradt (`stripeOnboardingComplete: true`).

**Elvárt eredmény:**
Az onboarding gomb Stripe Express fiókot hoz létre és a Stripe felületére irányít. A három állapot (nincs fiók / befejezetlen / aktív) helyesen jelenik meg, a callback sikeres kitöltés után aktiválja a fiókot.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-17-04: Támogatói szint (tier) létrehozása árazással és validációval

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN), a fiók menhelyhez rendelt |
| **URL** | `/dashboard/tiers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Előfizetési csomagok" oldal csak SHELTER_ADMIN szerepkörrel érhető el – más szerepkör a `/dashboard`-ra irányít át
- [ ] Az új csomag űrlapon megadható: Név (kötelező), Leírás (opcionális), Összeg (Ft/hó)
- [ ] Üres név vagy érvénytelen összeg esetén kliensoldali hiba: „Név és érvényes összeg megadása kötelező."
- [ ] 175 Ft alatti összegnél az API (`POST /api/shelters/[id]/tiers`) `400` hibával válaszol: „Az összeg minimum 175 Ft (Stripe limit)"
- [ ] Sikeres létrehozás után a csomag megjelenik a listában formázott árral (pl. „2 500 Ft / hó") és 0 előfizetővel
- [ ] A csomagok összeg szerint növekvő sorrendben listázódnak
- [ ] Az aktív csomag a publikus oldalon (`/hu/shelters/[slug]` és `/hu/donate`) `TierCard`-ként megjelenik a névvel, árral, leírással és előfizetőszámmal

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/tiers` oldalra.
2. (Negatív teszt) `user@test.hu` fiókkal másik böngészőben próbáld megnyitni az oldalt – ellenőrizd az átirányítást.
3. Nyisd meg az új csomag űrlapot, és hagyd üresen a nevet – ellenőrizd a „Név és érvényes összeg megadása kötelező." hibát.
4. Add meg a nevet (pl. „Bronz támogató"), de állíts 100 Ft összeget – ellenőrizd a minimum 175 Ft-ra figyelmeztető API-hibát.
5. Állítsd az összeget 1500 Ft-ra, adj leírást (pl. „Havi eledel-támogatás"), és mentsd.
6. Ellenőrizd, hogy a csomag megjelenik a listában „1 500 Ft / hó" felirattal.
7. Hozz létre egy második csomagot (pl. „Ezüst támogató", 5000 Ft) – ellenőrizd az összeg szerinti rendezést.
8. Nyisd meg a publikus menhelyoldalt (`/hu/shelters/[slug]`) – ellenőrizd, hogy mindkét csomag kártyaként megjelenik névvel, árral, leírással, előfizetőszámmal és „Feliratkozás" gombbal.

**Elvárt eredmény:**
A csomag csak érvényes névvel és legalább 175 Ft összeggel hozható létre. A létrehozott `DonationTier` rekordok a dashboardon és a publikus oldalakon is helyesen jelennek meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-17-05: Támogatói szint szerkesztése, aktiválás/inaktiválás és törlés

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; létezik legalább 2 csomag (TC-17-04) |
| **URL** | `/dashboard/tiers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A ceruza ikonnal a csomag szerkesztő módba vált („Szerkesztés" felirattal), a mezők az aktuális értékekkel előtöltöttek
- [ ] A módosítás (`PATCH /api/shelters/[id]/tiers/[tierId]`) mentés után azonnal látszik a listában; a „Mégse" gomb elveti a változtatásokat
- [ ] Szerkesztésnél is érvényes a minimum 175 Ft validáció
- [ ] Az aktív/inaktív kapcsoló (`isActive`) átállítása után az inaktív csomagnál „Inaktív" badge jelenik meg
- [ ] Inaktív csomag a publikus oldalon nem jelenik meg (a publikus `GET /api/shelters/[id]/tiers` csak `isActive: true` csomagokat ad vissza)
- [ ] A törlés megerősítő kérdéshez kötött („Biztosan törlöd ezt a csomagot?"), megerősítés után a csomag eltűnik a listából (`DELETE`)
- [ ] A változtatások oldal-újratöltés után is érvényesek

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/tiers` oldalra.
2. Kattints az első csomag ceruza ikonjára – ellenőrizd, hogy a mezők az aktuális értékekkel jelennek meg.
3. Módosítsd a nevet és az összeget (pl. 2000 Ft), majd mentsd – ellenőrizd a frissült adatokat a listában.
4. Lépj újra szerkesztő módba, módosíts valamit, majd kattints a „Mégse" gombra – ellenőrizd, hogy a változás nem mentődött.
5. Kapcsold a csomagot inaktívra – ellenőrizd az „Inaktív" badge megjelenését.
6. Nyisd meg a publikus menhelyoldalt – ellenőrizd, hogy az inaktív csomag nem látható, a másik igen.
7. Kapcsold vissza aktívra, majd a másik csomagnál kattints a törlés ikonra – ellenőrizd a megerősítő kérdést.
8. Erősítsd meg a törlést – ellenőrizd, hogy a csomag eltűnt, és újratöltés után sem jelenik meg.

**Elvárt eredmény:**
A csomag adatai szerkeszthetők, az aktív/inaktív állapot a publikus láthatóságot vezérli, a törlés megerősítéshez kötött és végleges.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-17-06: Előfizetés támogatói szintre Stripe Checkout-tal

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve; a menhelynek van aktív csomagja (TC-17-04); Stripe teszt mód konfigurálva |
| **URL** | `/hu/shelters/[slug]` vagy `/hu/donate` → Stripe Checkout |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `TierCard`-on a „Feliratkozás" gomb bejelentkezett felhasználóként `POST /api/checkout/subscribe` (`{ tierId }`) hívást indít, és a Stripe Checkout oldalára irányít
- [ ] Kijelentkezett állapotban az API `401` hibát ad („Bejelentkezés szükséges")
- [ ] Inaktív csomagra nem indítható checkout (`409` – „A csomag nem aktív")
- [ ] A Stripe Checkout a csomag árát havi ismétlődő (subscription) tételként mutatja; ha a menhely Stripe Connect fiókja aktív, a 4% platformdíj az összegre rárakódik
- [ ] A `4242 4242 4242 4242` teszt kártyával (bármilyen jövőbeli lejárat, bármilyen CVC) a fizetés sikeres
- [ ] Sikeres fizetés után a felhasználó a `/donate/success` oldalra kerül; a megszakított fizetés a menhely oldalára (`/shelters/[slug]`) irányít vissza
- [ ] A webhook feldolgozása után `ACTIVE` státuszú `Subscription` rekord jön létre a helyes `userId` és `tierId` értékekkel, `stripeSubId`-val
- [ ] A csomag előfizetőszámlálója nő, és az előfizetés megjelenik a felhasználó profiljának „Előfizetéseim" listájában

**Tesztelési lépések:**
1. Jelentkezz ki, navigálj a `/hu/shelters/[slug]` oldalra, és kattints az egyik csomag „Feliratkozás" gombjára – ellenőrizd a bejelentkezést kérő hibát/átirányítást.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal, és nyisd meg újra a menhely oldalát.
3. Kattints a „Feliratkozás" gombra – ellenőrizd az átirányítást a Stripe Checkout oldalára, és hogy az összeg havi ismétlődő tételként szerepel.
4. (Megszakítási ág) Lépj vissza a Checkout-ból – ellenőrizd, hogy a menhely oldalára kerülsz vissza, és nem jött létre előfizetés.
5. Indítsd újra a fizetést, és add meg a teszt kártyát: `4242 4242 4242 4242`, lejárat: bármely jövőbeli dátum, CVC: tetszőleges 3 számjegy.
6. Véglegesítsd a fizetést – ellenőrizd az átirányítást a sikeroldalra („Köszönjük az adományodat!" / donate success).
7. Ellenőrizd a profilodon az „Előfizetéseim" listában az új, aktív előfizetést.
8. Nyisd meg újra a menhely oldalát – ellenőrizd, hogy a csomag előfizetőszáma eggyel nőtt.

**Elvárt eredmény:**
A feliratkozás csak bejelentkezve, aktív csomagra indítható. A Stripe teszt kártyával a fizetés sikeres, létrejön az `ACTIVE` előfizetés, amely a felhasználói profilon és az előfizetőszámlálóban is tükröződik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-17-07: Előfizetők listája, szűrés és admin oldali lemondás

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; létezik legalább 1 `ACTIVE` előfizetés a menhely csomagjára (TC-17-06); `admin@test.hu` (SUPER_ADMIN) is bejelentkezhet |
| **URL** | `/dashboard/subscriptions` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Előfizetők" oldal táblázata a következő oszlopokat mutatja: Felhasználó (név + e-mail), Csomag, Összeg (HUF/hó), Státusz, Feliratkozott, Lemondás
- [ ] A SHELTER_ADMIN csak a saját menhelye csomagjaira kötött előfizetéseket látja; a SUPER_ADMIN az összeset, nála a csomag alatt a menhely neve is megjelenik
- [ ] A szűrősor („Összes" / „Aktív" / „Lemondott") a `?status=ACTIVE` / `?status=CANCELLED` query paraméterrel szűri a listát
- [ ] Az `ACTIVE` előfizetésnél zöld „Aktív" badge és lemondás gomb látható; a `CANCELLED`-nél szürke „Lemondott" badge, lemondás gomb nélkül
- [ ] A lemondás gomb megerősítő kérdést mutat („Biztosan le szeretnéd mondani ezt az előfizetést?"), megerősítés után `POST /api/subscriptions/[id]/admin-cancel` fut: a Stripe előfizetés azonnal törlődik, a rekord `CANCELLED` státuszú lesz `cancelledAt` időbélyeggel
- [ ] Már lemondott előfizetés ismételt lemondása `409` hibát ad („Az előfizetés már le van mondva")
- [ ] SHELTER_ADMIN nem mondhat le másik menhelyhez tartozó előfizetést (`403`)
- [ ] Az „Előfizetők CSV" exportgomb letölthető CSV fájlt ad a listáról

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/subscriptions` oldalra.
2. Ellenőrizd a táblázat oszlopait és az aktív előfizetés adatait (felhasználó neve/e-mailje, csomag, összeg, „Aktív" badge, feliratkozás dátuma).
3. Kattints az „Aktív" szűrőre – ellenőrizd, hogy csak `ACTIVE` előfizetések látszanak, és az URL `?status=ACTIVE` paramétert kap.
4. Kattints a „Lemondott" szűrőre – ellenőrizd a lemondott előfizetések listáját (ha még nincs, üres lista/„Nincs előfizető" jelenhet meg).
5. Az „Összes" nézetben kattints az aktív előfizetés lemondás gombjára – ellenőrizd a megerősítő kérdés szövegét.
6. Erősítsd meg a lemondást – ellenőrizd, hogy az előfizetés státusza „Lemondott"-ra vált, és a lemondás gomb eltűnik.
7. Ellenőrizd a felhasználói oldalon (`user@test.hu` profil, „Előfizetéseim"), hogy az előfizetés ott is lemondottként jelenik meg.
8. Kattints az „Előfizetők CSV" gombra – ellenőrizd, hogy a CSV fájl letöltődik a lista adataival.
9. Jelentkezz be `admin@test.hu` / `Admin1234!` fiókkal, és nyisd meg az oldalt – ellenőrizd, hogy minden menhely előfizetése látszik, a csomagnál a menhely nevével.

**Elvárt eredmény:**
A lista szerepkör szerint helyesen szűrt, a státusz-szűrők működnek. Az admin lemondás a Stripe-ban azonnal érvényesül, a rekord `CANCELLED` lesz, és ez a felhasználói oldalon is látszik. A CSV export letölthető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
