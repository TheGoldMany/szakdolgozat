# 06 – Üzenetváltás

## Összefoglalás

Ez a modul a felhasználók és menhelyek közötti közvetlen üzenetváltási rendszert fedi le. A felhasználók az állat oldaláról indíthatnak üzenetváltást, a menhely adminisztrátora a dashboardon válaszolhat, az olvasatlan üzenetek számlálója a fejlécben folyamatosan frissül, és az üzenet-validációs szabályok biztosítják a helyes inputot.

---

## Felhasználói Történetek

- **US-06-A**: Mint bejelentkezett felhasználó, szeretnék üzenetet küldeni egy menhelynek az állat oldaláról, hogy kérdéseket tehessek fel az örökbefogadás előtt.
- **US-06-B**: Mint bejelentkezett felhasználó, szeretném látni az összes üzenetváltásomat egy helyen, hogy nyomon kövessem a kommunikációt.
- **US-06-C**: Mint menhely adminisztrátor, szeretnék válaszolni a felhasználók üzeneteire a dashboardon keresztül, hogy hatékonyan kommunikálhassak az érdeklődőkkel.
- **US-06-D**: Mint bejelentkezett felhasználó, szeretnék értesítést kapni az olvasatlan üzenetekről a fejlécben, hogy ne maradjak le az üzenetekről.
- **US-06-E**: Mint felhasználó, szeretnék visszajelzést kapni, ha az üzenetem érvénytelen (túl hosszú vagy üres), hogy helyes inputot adhassak meg.

---

## Tesztesetek

---

### TC-06-01: Üzenet küldése menhelynek az állat oldaláról (új conversation indul)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; seed adatbázisban legalább egy `AVAILABLE` állat létezik ismert slug-gal |
| **URL** | `/hu/animals/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állat részletes oldalán „Üzenetet küldök" (vagy hasonló) gomb megjelenik
- [ ] A gombra kattintva megnyílik az üzenetküldő form vagy modal
- [ ] A form tartalmaz szöveges üzenetmezőt
- [ ] Üres üzenet nem küldhető el (validáció)
- [ ] Sikeres küldés után új conversation jön létre a felhasználó és a menhely között
- [ ] A conversation megjelenik a `/hu/messages` oldalon
- [ ] Ugyanattól a felhasználótól ugyanazon menhely felé a második üzenet nem nyit új conversation-t, hanem a meglévőbe kerül
- [ ] Bejelentkezés nélkül az üzenetküldő gomb kattintása login oldalra irányít

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj egy `AVAILABLE` állat részletes oldalára (pl. `/hu/animals/bodri`).
3. Keresd meg az „Üzenetet küldök" gombot, és kattints rá.
4. Próbálj meg üres üzenetet küldeni – ellenőrizd a validációs hibaüzenetet.
5. Írd be az üzenetet: „Üdvözlöm! Érdeklődnék Bodri örökbefogadása kapcsán. Mikor lehet meglátogatni?"
6. Kattints a „Küldés" gombra.
7. Ellenőrizd a visszaigazoló üzenetet (toast/sikerüzenet).
8. Navigálj a `/hu/messages` oldalra, és ellenőrizd, hogy a conversation megjelenik a seed menhely nevével.
9. Kattints a conversation-re, és ellenőrizd, hogy az elküldött üzenet megjelenik.
10. Menj vissza az állat oldalára, és küldj el egy második üzenetet – ellenőrizd, hogy nem nyílik új conversation, hanem a meglévőbe kerül.
11. Kijelentkezés után kattints az „Üzenetet küldök" gombra – ellenőrizd a login átirányítást.

**Elvárt eredmény:**
Az első üzenet küldésére új conversation jön létre, a továbbiakban a meglévő conversation folytatódik. Az üzenet megjelenik a `/hu/messages` oldalon. Üres üzenet nem küldhető, bejelentkezés nélkül loginra irányít.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-06-02: Üzenetek listája (/messages – conversations megjelenése)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; legalább egy conversation létezik a seed adatokban (korábbi üzenetváltás) |
| **URL** | `/hu/messages` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/messages` oldal megjeleníti az összes conversation-t listás nézetben
- [ ] Minden conversation-tételnél látható: a menhely neve, a menhely avatárja/logója, az utolsó üzenet előnézete (rövidítve), és az utolsó üzenet időbélyege
- [ ] Az olvasatlan conversation-ök vizuálisan kiemeltek (félkövér, badge vagy kiemelő szín)
- [ ] A conversation-ök időrend szerint vannak rendezve (legújabb elöl)
- [ ] Egy conversation-re kattintva a teljes üzenetváltás megjelenik
- [ ] A teljes üzenetváltás oldalon az üzenetek kronológikus sorrendben látszódnak (legrégibb elöl, legújabb alul)
- [ ] Üzenet küldése lehetséges a conversation részletes nézetéből is
- [ ] Ha nincs üzenetváltás, az oldal „Még nincs üzenetváltásod" üzenetet jelenít meg
- [ ] Bejelentkezés nélküli `/hu/messages` látogatás login oldalra irányít

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/messages` oldalra.
3. Ellenőrizd, hogy a conversation-lista megjelenik.
4. Ellenőrizd minden tételnél: menhely neve, logó/avatar, utolsó üzenet előnézete, időbélyeg.
5. Ellenőrizd, hogy az olvasatlan conversation vizuálisan ki van emelve.
6. Ellenőrizd, hogy a legutóbb üzenetet küldő conversation a lista tetején van.
7. Kattints egy conversation-re.
8. Ellenőrizd, hogy a teljes üzenetváltás megjelenik kronológikus sorrendben.
9. Ellenőrizd, hogy a conversation részletes nézetéből is küldhető üzenet.
10. Kijelentkezés után navigálj a `/hu/messages` URL-re – ellenőrizd a login átirányítást.

**Elvárt eredmény:**
A messages oldal helyesen listázza az összes conversation-t a releváns adatokkal, az olvasatlan tételek vizuálisan kiemeltek, a conversation részletes nézetben az üzenetek kronológikusan megjelennek, és új üzenet küldhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-06-03: Üzenet megválaszolása admin oldalról (dashboard)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Bejelentkezett menhely adminisztrátor: `shelter@test.hu` / `Admin1234!`; legalább egy megválaszolatlan üzenet létezik a menhelyhez (user@test.hu által küldött üzenet a seed adatokban) |
| **URL** | `/hu/dashboard/messages` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A shelter admin dashboard messages szekciója megjeleníti az összes beérkező conversation-t
- [ ] Az olvasatlan conversation-ök vizuálisan kiemeltek
- [ ] A conversation-re kattintva a teljes üzenetváltás megjelenik
- [ ] Az admin beírhat és elküldhet válasz üzenetet
- [ ] Üres válasz nem küldhető el
- [ ] Elküldés után a válasz azonnal megjelenik a conversation-ben
- [ ] A felhasználói oldalon (`user@test.hu`) a válasz megjelenik, és a conversation olvasatlannak jelölődik

**Tesztelési lépések:**
1. Nyiss két böngészőablakot.
2. Az első ablakban jelentkezz be: `shelter@test.hu` / `Admin1234!`.
3. Navigálj a `/hu/dashboard/messages` oldalra.
4. Keresd meg az olvasatlan conversation-t (`user@test.hu` üzenetével).
5. Kattints a conversation-re, és olvasd el a felhasználó üzenetét.
6. Próbálj meg üres választ küldeni – ellenőrizd a validációt.
7. Írd be a választ: „Kedves Érdeklődő! Bodrit szerdán 14:00-tól 16:00-ig lehet meglátogatni. Várakozunk szeretettel!"
8. Kattints a „Küldés" gombra.
9. Ellenőrizd, hogy a válasz azonnal megjelenik a conversation-ben.
10. A második ablakban jelentkezz be: `user@test.hu` / `User1234!`, navigálj a `/hu/messages` oldalra.
11. Ellenőrizd, hogy a conversation olvasatlannak jelölődik (badge/kiemelés), és a válasz szövege megjelenik az előnézetben.
12. Nyisd meg a conversation-t, és ellenőrizd, hogy a válasz megjelenik.

**Elvárt eredmény:**
Az admin sikeresen válaszol a felhasználói üzenetre a dashboardon, a válasz azonnal megjelenik, és a felhasználói oldalon a conversation olvasatlannak jelölődik. Üres válasz nem küldhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-06-04: Olvasatlan üzenetek számlálója a fejlécben (30 mp-es polling)

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; `shelter@test.hu` admin-fiók elérhető egy másik böngészőablakban |
| **URL** | Bármely oldal (fejléc), `/hu/messages` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A fejlécben megjelenik egy üzenet/levél ikon
- [ ] Ha van olvasatlan üzenet, az ikonon piros badge jelenik meg a számmal
- [ ] Ha nincs olvasatlan üzenet, a badge nem jelenik meg (vagy 0)
- [ ] Az üzenet számláló legfeljebb 30 másodpercen belül frissül, ha új üzenet érkezik (polling mechanizmus)
- [ ] A számláló csökken, amikor az üzenetek olvasottnak vannak jelölve (conversation megnyitása)
- [ ] Kijelentkezés után a számláló eltűnik

**Tesztelési lépések:**
1. Nyiss két böngészőablakot.
2. Az első ablakban jelentkezz be: `user@test.hu` / `User1234!`. Navigálj egy semleges oldalra (pl. `/hu/animals`).
3. Ellenőrizd a fejléc üzenet ikonjának állapotát (badge szám, ha van olvasatlan üzenet).
4. A második ablakban jelentkezz be: `shelter@test.hu` / `Admin1234!`, navigálj a `/hu/dashboard/messages` oldalra.
5. Küldj el egy új üzenetet a `user@test.hu` felhasználónak.
6. Térj vissza az első ablakba, és várd meg legfeljebb 30 másodpercet.
7. Ellenőrizd, hogy a fejléc üzenet ikonján megjelenik a badge (vagy a szám növekszik).
8. Kattints az üzenet ikonra, navigálj a `/hu/messages` oldalra.
9. Nyisd meg az olvasatlan conversation-t.
10. Ellenőrizd, hogy a fejléc badge számlálója csökken (a conversation olvasottnak jelölődik).
11. Ha több olvasatlan üzenet van, ellenőrizd, hogy az összes conversation megnyitása után a badge eltűnik.

**Elvárt eredmény:**
Az olvasatlan üzenetek számlálója legfeljebb 30 másodpercen belül automatikusan frissül a fejlécben. A badge száma pontosan tükrözi az olvasatlan conversation-ök számát, és csökken az olvasás után.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-06-05: Üzenet hossza max. ellenőrzése, üres üzenet nem küldhető

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Bejelentkezett felhasználó: `user@test.hu` / `User1234!`; nyitott conversation létezik (vagy az állat oldaláról megnyitható az üzenetküldő) |
| **URL** | `/hu/messages/[conversationId]`, `/hu/animals/[slug]` (üzenetküldő modal) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az üzenetmező üresen hagyva a „Küldés" gomb le van tiltva, vagy kattintáskor validációs hibaüzenet jelenik meg
- [ ] Csak szóközöket tartalmazó üzenet sem küldhető el (trim validáció)
- [ ] Az üzenetmező maximális karakterkorlátja érvényesül (pl. 1000 karakter)
- [ ] A karakterkorlát közelítésekor visszajelzés jelenik meg (pl. „950/1000 karakter")
- [ ] A korlátot meghaladó üzenet esetén a „Küldés" gomb le van tiltva, vagy hibaüzenet jelenik meg
- [ ] Érvényes (nem üres, nem túl hosszú) üzenet sikeresen elküldhető

**Tesztelési lépések:**
1. Jelentkezz be: `user@test.hu` / `User1234!`.
2. Navigálj a `/hu/messages` oldalra, és nyiss meg egy meglévő conversation-t (vagy nyisd meg az állat oldaláról az üzenetküldőt).
3. Hagyd üresen az üzenetmezőt, és kattints a „Küldés" gombra – ellenőrizd, hogy nem küldi el, és hibaüzenet/disabled állapot jelenik meg.
4. Írd be csak szóközöket az üzenetmezőbe (pl. 5 szóköz), és próbálj küldeni – ellenőrizd a validációt.
5. Töröld a mezőt, és írd be pontosan a maximális karakterszámnál 1-gyel több karaktert (pl. 1001 × „a" betű – másolással):
   - Ellenőrizd, hogy a karakterszámláló vörösre vált és/vagy a „Küldés" gomb letiltódik.
6. Töröld egy karaktert (1000-re csökkentve), és ellenőrizd, hogy a gomb engedélyezetté válik.
7. Küldj el egy pontosan a korlát határán lévő üzenetet – ellenőrizd, hogy sikeresen elküldhető.
8. Töröld az összes tartalmat, és írd be a normál üzenetet: „Normál teszt üzenet." – ellenőrizd a sikeres küldést.

**Elvárt eredmény:**
Üres és csak szóközből álló üzenet nem küldhető el. A karakterkorlátot meghaladó üzenet szintén blokkolva van, visszajelzéssel a közelítő határnál. Érvényes üzenet sikeresen elküldhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
