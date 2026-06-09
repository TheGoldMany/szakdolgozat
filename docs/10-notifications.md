# 10 – Értesítési rendszer

## Összefoglalás

Ez a modul fedi le a platform értesítési rendszerét. A felhasználók automatikus in-app értesítéseket kapnak különböző eseményekre (kérelem státuszváltás, önkéntesi jóváhagyás, kampány döntés stb.). Az értesítések a fejléc `NotificationBell` komponensén keresztül érhetők el, ahol piros badge jelzi az olvasatlan értesítések számát. Az értesítések egyenként vagy egyszerre is olvasottnak jelölhetők. A teljes értesítési lista a `/hu/notifications` oldalon érhető el, ahol az összes / csak olvasatlan szűrő is elérhető. Az értesítések 30 másodpercenként automatikusan frissülnek.

---

## Felhasználói Történetek

- **US-10-A**: Mint felhasználó, szeretnék automatikus értesítést kapni, amikor a kérelmem státusza megváltozik, hogy ne kelljen folyamatosan ellenőriznem.
- **US-10-B**: Mint felhasználó, szeretném látni az olvasatlan értesítések számát a fejlécben, hogy azonnal észrevegyem az új eseményeket.
- **US-10-C**: Mint felhasználó, szeretnék egyenként értesítéseket olvasottnak jelölni, hogy nyomon kövessem, mivel foglalkoztam.
- **US-10-D**: Mint felhasználó, szeretném az összes értesítésemet egyszerre olvasottnak jelölni, hogy gyorsan „kitakarítsam" a listát.
- **US-10-E**: Mint felhasználó, szeretném az összes értesítésemet egy dedikált oldalon áttekinteni és szűrni, hogy átlátható maradjon az értesítési előzményem.

---

## Tesztesetek

---

### TC-10-01: Értesítés megjelenik kérelem státuszváltozáskor

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezett és rendelkezik `PENDING` státuszú örökbefogadási kérelemmel; `shelter@test.hu` bejelentkezhet admin fiókként |
| **URL** | `/dashboard/applications` (admin) → értesítés megjelenik `user@test.hu`-nál |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Amikor az admin `PENDING` → `REVIEWING` státuszra változtatja a kérelmet, a felhasználó értesítést kap
- [ ] Az értesítés típusa `APPLICATION_REVIEWING` (vagy hasonló)
- [ ] Az értesítés tartalmaz: értelmező szöveget (pl. „Kérelmed elbírálás alatt van"), az állat nevét és linket a kérelemhez
- [ ] Az értesítés az adatbázisban létrejön a helyes `userId`, `type`, `title`, `href` értékekkel
- [ ] Az értesítés `readAt: null` értékkel jön létre (olvasatlan)
- [ ] A csengő badge száma eggyel nő a felhasználónál

**Tesztelési lépések:**
1. Nyisd meg két böngésző-lapot (vagy két böngészőt): egyet `user@test.hu`, egyet `shelter@test.hu` fiókkal.
2. A `user@test.hu` lapon navigálj a `/hu/notifications` vagy figyeld a fejléc csengőjét.
3. Jegyezd meg az aktuális olvasatlan értesítések számát.
4. A `shelter@test.hu` lapon navigálj a `/dashboard/applications` oldalra.
5. Keresd meg a `user@test.hu` felhasználó `PENDING` kérelmét.
6. Változtasd a státuszt `REVIEWING`-ra.
7. Várd meg, hogy a `user@test.hu` lapján a csengő badge száma frissüljön (max. 30 másodperc, automatikus polling).
8. Ellenőrizd, hogy az olvasatlan szám eggyel nőtt.
9. Kattints a csengőre – ellenőrizd, hogy az új értesítés megjelenik a dropdown-ban.
10. Ellenőrizd az értesítés szövegét és a linket.

**Elvárt eredmény:**
A státuszváltás után a felhasználó értesítést kap. Az értesítés megjelenik a csengő dropdown-ban, a badge száma nő, az értesítés `readAt: null` értékkel olvasatlan.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-10-02: Értesítési csengő badge megjelenítése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve; a felhasználónak van legalább 1 olvasatlan értesítése az adatbázisban |
| **URL** | Bármely oldal fejléce (pl. `/hu`) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `NotificationBell` komponens megjelenik a navigációs fejlécben bejelentkezett felhasználónak
- [ ] Ha van olvasatlan értesítés, piros kör badge jelenik meg a csengő ikonon
- [ ] A badge a pontos olvasatlan értesítések számát mutatja
- [ ] Ha az összes értesítés olvasott, a badge eltűnik
- [ ] Nem bejelentkezett felhasználónak a csengő nem jelenik meg (vagy badge nélkül jelenik meg)
- [ ] A csengőre kattintva dropdown nyílik a legutóbbi értesítésekkel

**Tesztelési lépések:**
1. Navigálj a `/hu` főoldalra kijelentkezve – ellenőrizd, hogy a csengő badge nem jelenik meg.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal.
3. Ellenőrizd, hogy a fejlécben megjelenik a `NotificationBell` komponens.
4. Ha van olvasatlan értesítés: ellenőrizd, hogy piros badge látható a csengő jobb felső sarkában.
5. Ellenőrizd, hogy a badge a helyes számot mutatja (az olvasatlan értesítések számát).
6. Kattints a csengőre – ellenőrizd, hogy dropdown nyílik a legutóbbi értesítésekkel.
7. Az összes értesítés olvasottnak jelölése után ellenőrizd, hogy a badge eltűnik.

**Elvárt eredmény:**
A csengő badge piros körben mutatja az olvasatlan értesítések számát. Bejelentkezés nélkül a badge nem jelenik meg. Olvasottá tétel után a badge eltűnik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-10-03: Értesítés olvasottnak jelölése egyenként

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve; legalább 2 olvasatlan értesítés létezik a felhasználóhoz |
| **URL** | Fejléc csengő dropdown, vagy `/hu/notifications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A csengő dropdown-ban vagy az értesítési listán az olvasatlan értesítések vizuálisan kiemeltek (pl. sötétebb háttér, kék pont)
- [ ] Minden értesítés mellett megjelenik egy „Olvasottnak jelöl" (pipa) gomb
- [ ] A gombra kattintva az adott értesítés `readAt` mezője frissül az aktuális időbélyeggel
- [ ] Az értesítés vizuálisan olvasottra vált (pl. halvány/szürke háttér, kék pont eltűnik)
- [ ] A csengő badge száma eggyel csökken
- [ ] Más értesítések érintetlenül maradnak
- [ ] Az oldalfrissítés után az olvasott státusz megmarad

**Tesztelési lépések:**
1. Navigálj a `/hu/notifications` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Ellenőrizd, hogy az olvasatlan értesítések vizuálisan kiemeltek.
3. Jegyezd meg az olvasatlan értesítések számát a csengő badge-en.
4. Kattints az első olvasatlan értesítés „Olvasottnak jelöl" (pipa) gombjára.
5. Ellenőrizd, hogy az értesítés vizuálisan olvasottra váltott (halvány/szürke).
6. Ellenőrizd, hogy a badge száma eggyel csökkent.
7. Ellenőrizd, hogy a többi értesítés érintetlenül maradt.
8. Frissítsd az oldalt – ellenőrizd, hogy az olvasott státusz megmarad.

**Elvárt eredmény:**
Az adott értesítés `readAt` mezője frissül, a badge számcsökkenti. A többi értesítés érintetlen marad. Az olvasott státusz persistens (oldal frissítés után is megmarad).

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-10-04: Összes értesítés olvasottnak jelölése egyszerre

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` bejelentkezve; legalább 3 olvasatlan értesítés létezik |
| **URL** | `/hu/notifications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/notifications` oldalon elérhető egy „Összes olvasottnak jelöl" / „Mindent olvasottnak jelöl" gomb (`markAllRead`)
- [ ] A gomb csak akkor aktív / látható, ha van legalább egy olvasatlan értesítés
- [ ] A gombra kattintva az összes értesítés `readAt` mezője frissül az aktuális időbélyeggel
- [ ] Az összes értesítés vizuálisan olvasottra vált (nincs kiemelés, nincsenek kék pontok)
- [ ] A csengő badge teljesen eltűnik (0 olvasatlan)
- [ ] A „Csak olvasatlan" szűrő aktiválásakor üres lista jelenik meg
- [ ] Az oldalfrissítés után az állapot megmarad

**Tesztelési lépések:**
1. Navigálj a `/hu/notifications` oldalra bejelentkezve `user@test.hu` / `User1234!` fiókkal.
2. Ellenőrizd, hogy legalább 3 olvasatlan értesítés látható (kiemelve).
3. Jegyezd meg az aktuális badge számot.
4. Keresd meg az „Összes olvasottnak jelöl" / `markAllRead` gombot az oldal tetején.
5. Kattints a gombra.
6. Ellenőrizd, hogy az összes értesítés halvánnyá/szürkévé vált (nincs kék pont).
7. Ellenőrizd, hogy a fejléc csengő badge-je eltűnt vagy 0-t mutat.
8. Kattints a „Csak olvasatlan" szűrőre – ellenőrizd, hogy üres lista jelenik meg.
9. Frissítsd az oldalt – ellenőrizd, hogy az állapot megmarad.

**Elvárt eredmény:**
Az összes értesítés `readAt` mezője frissül, a badge eltűnik, a csak olvasatlan szűrőnél üres lista jelenik meg. Az állapot persistens.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-10-05: Értesítések teljes listája és szűrése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` bejelentkezve; a felhasználónak vegyes (olvasott és olvasatlan) értesítései vannak |
| **URL** | `/hu/notifications` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül nem érhető el – átirányít bejelentkezésre
- [ ] Az oldal betölt és listázza az összes értesítést (`NotificationsCenter` komponens)
- [ ] Alapértelmezetten az összes értesítés látható (olvasott és olvasatlan egyaránt)
- [ ] Elérhető „Csak olvasatlan" szűrő, amely csak az olvasatlan értesítéseket mutatja
- [ ] Minden értesítés-soron megjelenik: ikon (típus szerint), cím, leírás, relatív időbélyeg (pl. „5 perce", „2 órája", „3 napja")
- [ ] Az értesítésen kattintva a releváns oldalra navigál (ha `href` van megadva)
- [ ] Az értesítések törlési lehetősége elérhető (ha implementált)
- [ ] Az olvasatlan értesítések vizuálisan kiemeltek az olvasottakhoz képest

**Tesztelési lépések:**
1. Navigálj a `/hu/notifications` URL-re kijelentkezve – ellenőrizd az átirányítást.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal.
3. Navigálj a `/hu/notifications` oldalra.
4. Ellenőrizd, hogy az összes értesítés listázódik (olvasott + olvasatlan).
5. Ellenőrizd az értesítések vizuális stílusát: olvasatlan = kiemelt, olvasott = halvány.
6. Ellenőrizd a relatív időbélyegeket (pl. „5 perce", „tegnap").
7. Ellenőrizd, hogy az értesítés ikonja típusonként eltér (pl. kérelemhez `FileText` ikon, önkéntességhez `HandHeart` ikon).
8. Kattints a „Csak olvasatlan" szűrőre – ellenőrizd, hogy csak olvasatlan értesítések jelennek meg.
9. Kattints az „Összes" szűrőre – ellenőrizd, hogy visszatér az összes értesítés.
10. Kattints egy értesítésen, amelynek van `href`-je – ellenőrizd, hogy a helyes oldalra navigál.

**Elvárt eredmény:**
Az oldal betölt az összes értesítéssel, az olvasott/olvasatlan szűrő funkcionál, az ikonok típusonként eltérnek, a relatív időbélyegek helyesek. Az értesítésen kattintva a releváns oldalra navigál.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
