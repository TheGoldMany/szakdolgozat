# 07 – Kampányok, adományok, előfizetések

## Összefoglalás

Ez a modul fedi le az adományozási és előfizetési rendszert. A platform lehetővé teszi aktív kampányok böngészését és egyszeri adomány beküldését Stripe Checkout segítségével. A menhelyek havi előfizetési szinteket (tierek) hozhatnak létre, amelyekre a felhasználók feliratkozhatnak. Az előfizetések kezelése (lemondás) a saját profiloldalon érhető el. Kampányokat bejelentkezett felhasználók is indíthatnak, amelyek adminisztratív jóváhagyásra várnak. A Stripe webhook feldolgozza a sikeres fizetéseket és frissíti az adatbázis-rekordokat.

---

## Felhasználói Történetek

- **US-07-A**: Mint látogató, szeretnék aktív kampányokat böngészni és megismerni a célösszegeket, hogy informált döntést hozzak az adományozásról.
- **US-07-B**: Mint bejelentkezett felhasználó, szeretnék egyszeri adományt küldeni egy kampánynak Stripe-on keresztül, hogy pénzügyi támogatást nyújtsak.
- **US-07-C**: Mint bejelentkezett felhasználó, szeretnék havi előfizetéssel támogatni egy menhelyet, hogy rendszeres bevételt biztosítsak számukra.
- **US-07-D**: Mint előfizető felhasználó, szeretném lemondani az előfizetésemet a profiloldalamon, hogy ne terhelje tovább a bankszámlámat.
- **US-07-E**: Mint bejelentkezett felhasználó, szeretnék saját kampányt indítani, hogy állatokat vagy programokat támogassak.

---

## Tesztesetek

---

### TC-07-01: Aktív kampányok listájának megtekintése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Az adatbázisban legalább 2 aktív (`ACTIVE` státuszú) kampány létezik seed adatokkal |
| **URL** | `/hu/donate` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül is elérhető
- [ ] Minden aktív kampány `CampaignCard` komponensként jelenik meg
- [ ] Minden kártyán látható: kampány neve/címe, a menhely neve, célösszeg (pl. „50 000 Ft"), összegyűjtött összeg, haladás (`progress bar`), és a donátorok száma
- [ ] A progress bar vizuálisan arányosan tükrözi az összegyűjtött / célösszeg arányt (0–100%)
- [ ] Ha a célösszeget elérték, a progress bar 100%-on áll és jelzi a teljesítést
- [ ] A kártyára kattintva a `/hu/donate/[id]` részletes oldalra navigál
- [ ] Az oldalon megjelennek a menhely-előfizetési szintek (`TierCard`) is, ha aktív tierek léteznek

**Tesztelési lépések:**
1. Nyisd meg a böngészőt és navigálj a `/hu/donate` URL-re (bejelentkezés nélkül).
2. Ellenőrizd, hogy a kampánykártyák grid-ben jelennek meg.
3. Vizsgáld meg az első kampánykártyát: ellenőrizd a cím, menhely, célösszeg, összegyűjtött összeg és donátorok száma mezőket.
4. Ellenőrizd a progress bar kitöltöttségét – arányos-e az összegyűjtött / célösszeg értékkel.
5. Görgess le az oldal aljára, és nézd meg, hogy a menhely-szintű `TierCard`-ok is megjelennek-e.
6. Kattints az egyik kampánykártyára.
7. Ellenőrizd, hogy a `/hu/donate/[id]` oldalra navigál.

**Elvárt eredmény:**
Az oldal betölt, az aktív kampányok kártyákon jelennek meg a helyes célösszeg, összegyűjtött összeg és vizuális progress bar értékekkel. A kártyákra kattintva a részletes kampányoldalra navigál. Az előfizetési szintek (ha vannak) szintén láthatók.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-07-02: Kampány részleteinek megtekintése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Legalább egy aktív kampány létezik az adatbázisban; a kampány `id`-je ismert |
| **URL** | `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A kampány részletes leírása megjelenik
- [ ] A célösszeg, az összegyűjtött összeg és a progress bar megjelenik
- [ ] A donátorok száma látható (pl. „12 támogató")
- [ ] Az adomány-küldési form (`DonateForm`) megjelenik bejelentkezett felhasználónak
- [ ] Nem bejelentkezett látogatónak a form helyett bejelentkezési felhívás jelenik meg, vagy a bejelentkezési oldalra irányít
- [ ] Az előre beállított összegek gombjai (pl. 1 000 Ft, 2 000 Ft, 5 000 Ft, 10 000 Ft) megjelennek
- [ ] Az egyedi összeg megadásának lehetősége elérhető
- [ ] Az „Anonim adomány" jelölőnégyzet elérhető

**Tesztelési lépések:**
1. Navigálj a `/hu/donate` oldalra és kattints egy aktív kampányra.
2. Ellenőrizd, hogy a kampány teljes leírása olvasható.
3. Ellenőrizd a célösszeg, összegyűjtött összeg és donátorok száma mezőket.
4. Jelentkezz be `user@test.hu` / `User1234!` adatokkal (ha még nem vagy bejelentkezve).
5. Navigálj vissza a kampány részletes oldalára.
6. Ellenőrizd, hogy az adományozási form megjelenik előre beállított összeggombokkal.
7. Kattints a „2 000 Ft" gombra – ellenőrizd, hogy aktívvá válik.
8. Kattints az „Egyedi összeg" mezőre, és gépeld be: `3500`.
9. Ellenőrizd, hogy az összeg mező frissül.

**Elvárt eredmény:**
A kampány részletes oldala betölt, a leírás, progress bar és donátor-szám helyesen megjelenik. Bejelentkezett felhasználóként az adományozási form elérhető az előre beállított összegekkel és egyedi összeg opcióval.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-07-03: Egyszeri adomány beküldése Stripe-on keresztül

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó (`user@test.hu`); aktív kampány létezik; Stripe teszt mód aktív |
| **URL** | `/hu/donate/[id]` → Stripe Checkout |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Küldés" / „Adományozás" gombra kattintva Stripe Checkout oldalra irányít
- [ ] A Stripe oldalon az összeg helyesen jelenik meg (pl. „2 000 HUF")
- [ ] Teszt kártyával a fizetés sikeresen lebonyolítható
- [ ] Sikeres fizetés után a `/hu/donate/success` oldalra irányít
- [ ] A sikeres oldalon visszaigazoló üzenet jelenik meg
- [ ] Az adomány összege megjelenik a kampány összegyűjtött összegében (progress bar frissül)
- [ ] A donátorok száma eggyel nő

**Tesztelési lépések:**
1. Navigálj a `/hu/donate/[id]` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Válaszd az „5 000 Ft" preset összeget.
3. Opcionálisan írj üzenetet az „Üzenet (opcionális)" mezőbe: `Teszt adomány`.
4. Kattints az „Adományozás" / „Küldés" gombra.
5. Ellenőrizd, hogy Stripe Checkout oldalra irányít, és az összeg „5 000 HUF".
6. Töltsd ki a Stripe formot teszt adatokkal:
   - Kártyaszám: `4242 4242 4242 4242`
   - Lejárat: `12/29`
   - CVC: `424`
   - Névjegy: `Teszt Felhasználó`
7. Kattints a „Fizetés" gombra.
8. Ellenőrizd, hogy a `/hu/donate/success` oldalra irányít.
9. Navigálj vissza a kampány oldalára és ellenőrizd a progress bar és donátor-szám frissülését.

**Elvárt eredmény:**
A Stripe Checkout sikeres, az átirányítás a `/hu/donate/success` oldalra megtörténik. A kampány összegyűjtött összege nő, a donátorok száma eggyel nő.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-07-04: Sikeres fizetés után Stripe webhook feldolgozása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | TC-07-03 sikeresen lefutott; Stripe webhook végpont (`/api/webhooks/stripe`) konfigurálva van; Stripe CLI vagy Stripe Dashboard elérhető a webhook esemény ellenőrzéséhez |
| **URL** | `/api/webhooks/stripe` (backend végpont) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `checkout.session.completed` Stripe webhook esemény feldolgozódik
- [ ] Az adatbázisban létrejön egy új `Donation` rekord a helyes `campaignId`, `userId`, `amount` és `status: COMPLETED` értékekkel
- [ ] A kampány `raisedAmount` mezője frissül az új adomány összegével
- [ ] A webhook feldolgozása idempotens: ugyanazon esemény ismételt feldolgozása nem hoz létre duplikált rekordot
- [ ] Sikertelen webhook esetén (érvénytelen aláírás) a végpont 400-as hibával válaszol

**Tesztelési lépések:**
1. Hajtsd végre a TC-07-03 tesztesetet (sikeres Stripe fizetés).
2. Nyisd meg a Stripe Dashboard-ot (teszt mód) → **Developers** → **Webhooks** → nézd meg a legutóbbi eseményt.
3. Ellenőrizd, hogy a `checkout.session.completed` esemény feldolgozódott (státusz: `Delivered`).
4. Csatlakozz az adatbázishoz (pl. Prisma Studio: `npx prisma studio`) és keresd meg a legutóbbi `Donation` rekordot.
5. Ellenőrizd a rekord mezőit: `campaignId` egyezik, `amount` = 5000, `status` = `COMPLETED`.
6. Ellenőrizd a `Campaign` rekordot: a `raisedAmount` nőtt-e az adomány összegével.
7. Kíséreld meg a webhook újraküldését a Stripe Dashboard-ból – ellenőrizd, hogy nem jött létre duplikált `Donation` rekord.

**Elvárt eredmény:**
A webhook esemény feldolgozódik, az adatbázisban egy új `Donation` rekord jön létre `COMPLETED` státusszal, a kampány `raisedAmount` frissül. Duplikáció nem fordul elő ismételt feldolgozáskor.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-07-05: Havi előfizetés indítása menhely profilján

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó (`user@test.hu`); legalább egy menhely rendelkezik aktív előfizetési szinttel (`TierCard`); Stripe teszt mód aktív |
| **URL** | `/hu/donate` vagy `/hu/shelters/[slug]` → Stripe Checkout |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `TierCard` komponens megjelenik a menhely nevével, a szint nevével, havi összeggel és az aktuális előfizetők számával
- [ ] Az „Előfizetés" / „Támogatom" gombra kattintva Stripe Checkout előfizetési oldalra irányít
- [ ] A Stripe oldalon megjelenik a „Havi előfizetés" jelleg és a helyes összeg
- [ ] Teszt kártyával az előfizetés sikeresen aktiválható
- [ ] Sikeres előfizetés után az átirányítás megtörténik (pl. `/hu/donate/success` vagy a menhely profilra)
- [ ] Az előfizetők száma a `TierCard`-on eggyel nő
- [ ] A felhasználó profilja → Előfizetéseim listában megjelenik az új aktív előfizetés

**Tesztelési lépések:**
1. Navigálj a `/hu/donate` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Görgess le a menhely-előfizetési szintek (`TierCard`-ok) szekciójához.
3. Válassz ki egy `TierCard`-ot és jegyezd meg a havi összeget és az előfizetők számát.
4. Kattints az „Előfizetés" / „Támogatom" gombra.
5. Ellenőrizd, hogy Stripe Checkout oldalra irányít, a havi összeg helyesen szerepel, és az előfizetés jellegű (recurring).
6. Töltsd ki a Stripe formot:
   - Kártyaszám: `4242 4242 4242 4242`
   - Lejárat: `12/29`
   - CVC: `424`
7. Kattints a „Fizetés" gombra.
8. Navigálj a `/hu/profile` oldalra és keresd az „Előfizetéseim" szekciót.
9. Ellenőrizd, hogy az új előfizetés `ACTIVE` státusszal megjelenik.

**Elvárt eredmény:**
Az előfizetés sikeresen aktiválódik Stripe Checkout-on keresztül. A profil Előfizetéseim listájában az új aktív előfizetés megjelenik. A `TierCard`-on az előfizetők száma nő.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-07-06: Előfizetés lemondása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` fióknak van aktív (`ACTIVE`) előfizetése (TC-07-05 lefutott, vagy seed adat); Stripe teszt mód aktív |
| **URL** | `/hu/profile` → Előfizetéseim szekció |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A profil oldal „Előfizetéseim" szekciójában az aktív előfizetések listázódnak
- [ ] Minden előfizetésnél megjelenik a menhely neve, a szint neve, a havi összeg és a státusz (`ACTIVE`)
- [ ] A „Lemondás" gomb elérhető az aktív előfizetéseknél
- [ ] A „Lemondás" gombra kattintva megerősítő dialógus jelenik meg
- [ ] Megerősítés után az előfizetés státusza `CANCELLED`-re vált az adatbázisban
- [ ] A Stripe oldalon az előfizetés lemondásra kerül (teszt Dashboard-ban ellenőrizhető)
- [ ] A felhasználó a lemondás időpontját látja (pl. „Lemondva: 2026. jún. 9.")
- [ ] A lemondott előfizetés nem terheli tovább a felhasználót

**Tesztelési lépések:**
1. Navigálj a `/hu/profile` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Keresd meg az „Előfizetéseim" szekciót az oldalon.
3. Ellenőrizd, hogy legalább egy `ACTIVE` státuszú előfizetés látható.
4. Kattints a „Lemondás" gombra az aktív előfizetés mellett (`SubscriptionCancelButton` komponens).
5. Ellenőrizd, hogy megerősítő dialógus vagy kérés jelenik meg.
6. Erősítsd meg a lemondást.
7. Ellenőrizd, hogy az előfizetés státusza `CANCELLED`-re vált az oldalon.
8. Nyisd meg a Stripe Dashboard-ot (teszt mód) → **Subscriptions** → ellenőrizd, hogy az előfizetés lemondott.
9. Frissítsd az oldalt, és ellenőrizd, hogy a státusz megmarad `CANCELLED`-nek.

**Elvárt eredmény:**
Az előfizetés sikeresen lemondódik, státusza `CANCELLED`-re vált az adatbázisban és a Stripe-ban is. A profil oldal frissül, és a lemondott előfizetés lemondottként jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-07-07: Kampány indítása felhasználóként

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó (`user@test.hu` / `User1234!`) |
| **URL** | `/hu/campaigns/new` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül nem érhető el – átirányít a bejelentkezési oldalra
- [ ] A form tartalmaz: Kampány neve (kötelező), Leírás (kötelező), Célösszeg (kötelező, minimum 1 000 Ft), Menhely kiválasztása (opcionális)
- [ ] Érvénytelen adatok esetén hibaüzenetek jelennek meg
- [ ] Sikeres beküldés után a kampány `PENDING` státusszal jön létre az adatbázisban
- [ ] A felhasználó visszajelzést kap a sikeres beküldésről (toast vagy átirányítás)
- [ ] A kampány nem jelenik meg a nyilvános `/hu/donate` oldalon mindaddig, amíg admin jóvá nem hagyja
- [ ] Az admin Dashboard → Jóváhagyások (`/dashboard/campaigns`) oldalon megjelenik az új `PENDING` kampány

**Tesztelési lépések:**
1. Navigálj a `/hu/campaigns/new` URL-re kijelentkezve.
2. Ellenőrizd, hogy átirányítás történik a bejelentkezési oldalra.
3. Jelentkezz be `user@test.hu` / `User1234!` fiókkal.
4. Navigálj újra a `/hu/campaigns/new` oldalra.
5. Töltsd ki a mezőket:
   - Kampány neve: `Teszt Kampány 2026`
   - Leírás: `Ez egy teszt kampány a tesztelési folyamathoz.`
   - Célösszeg: `25000`
6. Kattints a „Kampány indítása" / „Küldés" gombra.
7. Ellenőrizd, hogy sikerüzenet jelenik meg.
8. Navigálj a `/hu/donate` oldalra – ellenőrizd, hogy az új kampány NEM jelenik meg.
9. Jelentkezz be `admin@test.hu` / `Admin1234!` fiókkal.
10. Navigálj a `/dashboard/campaigns` oldalra – ellenőrizd, hogy a `Teszt Kampány 2026` `PENDING` státusszal szerepel.

**Elvárt eredmény:**
A kampány `PENDING` státusszal jön létre, a nyilvános oldalon nem látható, de az admin jóváhagyási listán megjelenik. Bejelentkezés nélkül az oldal nem érhető el.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
