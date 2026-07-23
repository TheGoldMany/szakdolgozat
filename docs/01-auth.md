# 01 – Autentikáció

## Összefoglalás

A platform e-mail/jelszó alapú regisztrációt és Google OAuth bejelentkezést támogat.  
A jelszavak bcrypt titkosítással tárolódnak. E-mail visszaigazolás szükséges egyes funkciókhoz.

A publikus regisztrációs oldalon (`/auth/register`) a látogató választhat, hogy **sima felhasználóként** vagy **menhelyként** regisztrál. A menhely opció kiválasztásakor megjelennek a menhely-specifikus mezők (menhely neve, cím, város, telefonszám, e-mail stb.); beküldéskor a rendszer létrehozza a felhasználót ÉS egy `Shelter` rekordot (`isActive: true`, `isVerified: false` – super admin általi jóváhagyásra várva), a felhasználót pedig a menhely `SHELTER_ADMIN`-jaként kapcsolja hozzá. A felhasználó `SHELTER_ADMIN` szerepkört kap és eléri a `/dashboard`-ot.

A super admin által **felfüggesztett** (suspended) fiók továbbra is be tud jelentkezni és böngészhet, de mutáló műveleteket nem hajthat végre: ezekre a szerver HTTP `403` választ ad „fiók fel van függesztve" üzenettel.

---

## Felhasználói Történetek

- **US-01-A**: Mint látogató, szeretnék fiókot létrehozni e-mail és jelszó megadásával, hogy hozzáférjek az örökbefogadási funkciókhoz.
- **US-01-B**: Mint regisztrált felhasználó, szeretnék bejelentkezni, hogy folytassam a munkámat.
- **US-01-C**: Mint felhasználó, szeretnék Google-fiókkal bejelentkezni, hogy ne kelljen jelszót megjegyeznem.
- **US-01-D**: Mint felhasználó, szeretném visszaállítani az elfelejtett jelszavamat e-mailen keresztül.
- **US-01-E**: Mint bejelentkezett felhasználó, szeretnék kijelentkezni, hogy biztonságban maradjanak az adataim.
- **US-01-F**: Mint menhelyet üzemeltető látogató, szeretnék közvetlenül menhelyként regisztrálni, hogy azonnal saját menhely-fiókot és admin hozzáférést kapjak a rendszerhez.
- **US-01-G**: Mint super admin, szeretném, hogy egy felfüggesztett fiók továbbra is be tudjon jelentkezni és böngészhessen, de ne végezhessen módosító műveleteket, amíg a felfüggesztés fennáll.

---

## Tesztesetek

---

### TC-01-01: Sikeres regisztráció e-mail alapján

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A felhasználó nincs bejelentkezve, az e-mail még nem regisztrált |
| **URL** | `/auth/register` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A form minden kötelező mezőt tartalmaz (Név, E-mail, Jelszó)
- [ ] A jelszónak minimum 8 karakter, legalább 1 szám és 1 nagybetű kell
- [ ] Sikeres regisztráció után a felhasználó visszaigazoló e-mailt kap
- [ ] A rendszer átirányít a bejelentkezési/főoldalra

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/register` URL-re
2. Add meg: Teljes név: `Teszt Felhasználó`
3. Add meg: E-mail: `uj.felhasznalo@example.com`
4. Add meg: Jelszó: `Jelszo123!`
5. Kattints a **„Regisztráció"** gombra

**Elvárt eredmény:**
- Sikerüzenet jelenik meg, pl. „Ellenőrizd az e-mail-fiókod"
- A megadott e-mail-re visszaigazoló e-mail érkezik
- A fiók létrejön az adatbázisban `USER` szerepkörrel
- Átirányítás a főoldalra vagy bejelentkezési oldalra

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-02: Regisztráció érvénytelen adatokkal

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A felhasználó nincs bejelentkezve |
| **URL** | `/auth/register` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Üres kötelező mező esetén a form nem küldhető el
- [ ] Érvénytelen e-mail formátum esetén hibaüzenet jelenik meg
- [ ] Gyenge jelszó (< 8 karakter) esetén hibaüzenet jelenik meg
- [ ] Már regisztrált e-mail esetén hibaüzenet jelenik meg

**Tesztelési lépések (4 al-eset):**

*a) Üres form küldése:*
1. Navigálj a `/hu/auth/register` oldalra
2. Kattints a „Regisztráció" gombra kitöltés nélkül

*b) Érvénytelen e-mail:*
1. E-mail mezőbe: `nemvalidemail`
2. Kattints a gombra

*c) Gyenge jelszó:*
1. Jelszó mezőbe: `abc`
2. Kattints a gombra

*d) Már létező e-mail:*
1. E-mail: `user@test.hu` (seed-ben létező)
2. Jelszó: érvényes
3. Kattints a gombra

**Elvárt eredmény:**
- a) Validációs hibák minden kötelező mezőnél
- b) „Érvénytelen e-mail cím" hibaüzenet
- c) Jelszó-követelmény hibaüzenet
- d) „Ez az e-mail cím már foglalt" vagy hasonló hibaüzenet

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-03: Sikeres bejelentkezés e-mail + jelszóval

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A felhasználó regisztrált fiókkal rendelkezik (`user@test.hu` / `User1234!`) |
| **URL** | `/auth/login` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Helyes adatokkal a bejelentkezés sikeres
- [ ] A munkamenet (session cookie) létrejön
- [ ] A felhasználó átirányítódik a főoldalra vagy a `callbackUrl`-re
- [ ] A fejlécben megjelenik a felhasználó neve / avatárja

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/login` oldalra
2. E-mail: `user@test.hu`
3. Jelszó: `User1234!`
4. Kattints a **„Bejelentkezés"** gombra

**Elvárt eredmény:**
- Sikeres bejelentkezés, átirányítás a főoldalra
- A header jobb oldalán megjelenik a felhasználó avatárja/neve
- A `next-auth.session-token` cookie beállításra kerül

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-04: Bejelentkezés helytelen jelszóval

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Létező fiók: `user@test.hu` |
| **URL** | `/auth/login` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Helytelen jelszóval nem lehet belépni
- [ ] Informatív, de nem részletező hibaüzenet jelenik meg
- [ ] Nem derül ki, hogy az e-mail-cím regisztrált-e (biztonsági szempont)

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/login` oldalra
2. E-mail: `user@test.hu`
3. Jelszó: `RosszJelszo999`
4. Kattints a „Bejelentkezés" gombra

**Elvárt eredmény:**
- „Érvénytelen e-mail cím vagy jelszó" hibaüzenet (vagy hasonló, nem specifikus)
- A felhasználó NEM kerül bejelentkezve
- Nem irányítódik át máshova

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-05: Google OAuth bejelentkezés

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Google OAuth konfigurálva a `.env`-ben (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) |
| **URL** | `/auth/login` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Bejelentkezés Google-lal" gomb megjelenik
- [ ] Kattintásra a Google OAuth felületre irányít
- [ ] Sikeres OAuth után a felhasználó visszakerül az appba
- [ ] Első OAuth-bejelentkezéskor új `User` rekord jön létre
- [ ] Második bejelentkezéskor a meglévő fiókhoz kapcsolódik

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/login` oldalra
2. Kattints a **„Bejelentkezés Google-lal"** gombra
3. A Google felületen válassz egy tesztfiókot
4. Fogadd el az engedélyeket

**Elvárt eredmény:**
- Visszairányítás az appba, sikeres bejelentkezés
- A fejlécben a Google profilkép jelenik meg
- Az adatbázisban `Account` rekord jön létre `provider: "google"` értékkel

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-06: Kijelentkezés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A felhasználó be van jelentkezve |
| **URL** | Bármely oldal (header) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A kijelentkezés töröl minden session cookie-t
- [ ] A felhasználó a főoldalra vagy bejelentkezési oldalra irányítódik
- [ ] A védett oldalak (`/favorites`, `/applications` stb.) nem elérhetők tovább

**Tesztelési lépések:**
1. Legyen bejelentkezve bármely felhasználóként
2. Kattints a fejléc jobb felső avatár ikonjára
3. A megjelenő menüben kattints a **„Kijelentkezés"** gombra

**Elvárt eredmény:**
- Átirányítás a főoldalra
- A header bejelentkezési/regisztrációs linkeket mutat
- A `/favorites` oldalra navigálva bejelentkezési oldalra irányít

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-07: Regisztráció menhelyként (menhely önregisztráció)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A felhasználó nincs bejelentkezve, az e-mail még nem regisztrált |
| **URL** | `/auth/register` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A regisztrációs oldalon választható a regisztráció típusa: **felhasználó** vagy **menhely**
- [ ] A „menhely" opció kiválasztásakor megjelennek a menhely mezők (menhely neve, cím, város, telefonszám, menhely e-mail stb.)
- [ ] A kötelező menhely mezők kitöltése nélkül a form nem küldhető el
- [ ] Sikeres beküldéskor létrejön a `User` rekord és egy hozzá kapcsolt `Shelter` rekord (`isActive: true`, `isVerified: false`)
- [ ] A felhasználó `SHELTER_ADMIN` szerepkört kap, és a menhely `SHELTER_ADMIN`-jaként kapcsolódik hozzá
- [ ] A menhely a super admin jóváhagyásáig `isVerified: false` (jóváhagyásra vár) állapotban marad
- [ ] Bejelentkezés után a felhasználó eléri a `/dashboard` oldalt

**Tesztelési lépések:**
1. Navigálj a `/hu/auth/register` URL-re
2. Válaszd a **menhelyként** való regisztráció opciót
3. Ellenőrizd, hogy megjelennek a menhely mezők
4. Add meg a felhasználói adatokat (pl. Név: `Menhely Kezelő`, E-mail: `uj.menhely@example.com`, Jelszó: `Jelszo123!`)
5. Töltsd ki a menhely mezőket (pl. Menhely neve: `Boldog Mancsok Menhely`, Cím: `Fő utca 1.`, Város: `Budapest`, Telefon: `+36301234567`, menhely e-mail)
6. Kattints a **„Regisztráció"** gombra
7. Jelentkezz be az új fiókkal, és navigálj a `/dashboard` oldalra

**Elvárt eredmény:**
- A regisztráció sikeres, létrejön a `User` és a hozzá kapcsolt `Shelter` rekord (`isActive: true`, `isVerified: false`)
- A felhasználó `SHELTER_ADMIN` szerepkört kap, és a menhely admin-jaként kapcsolódik hozzá
- A menhely a super admin verifikációjáig jóváhagyásra váró állapotban van
- Bejelentkezés után a `/dashboard` elérhető a felhasználó számára

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-01-08: Felfüggesztett fiók bejelentkezhet, de műveleteket nem hajthat végre

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Létező felhasználói fiók (`user@test.hu` / `User1234!`), amelyet egy super admin (`admin@test.hu`) felfüggesztett |
| **URL** | `/auth/login` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A felfüggesztett felhasználó a helyes jelszóval sikeresen be tud jelentkezni
- [ ] A felfüggesztett felhasználó böngészhet (publikus oldalak, listák megtekinthetők)
- [ ] Mutáló művelet kísérletekor a szerver HTTP `403` választ ad „fiók fel van függesztve" üzenettel
- [ ] A művelet nem hajtódik végre (nincs adatbázis-módosítás)

**Tesztelési lépések:**
1. Super adminként (`admin@test.hu` / `Admin1234!`) függeszd fel a `user@test.hu` fiókot
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal a `/hu/auth/login` oldalon
3. Ellenőrizd, hogy a bejelentkezés sikeres, és a böngészés (pl. állatlisták megtekintése) működik
4. Próbálj végrehajtani egy mutáló műveletet (pl. állat kedvencekhez adása vagy örökbefogadási kérelem beküldése)
5. Ellenőrizd a szerver válaszát

**Elvárt eredmény:**
- A felfüggesztett felhasználó sikeresen bejelentkezik és böngészhet
- A mutáló művelet HTTP `403` választ ad „fiók fel van függesztve" üzenettel
- A művelet nem eredményez adatbázis-módosítást

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
