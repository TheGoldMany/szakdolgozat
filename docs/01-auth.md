# 01 – Autentikáció

## Összefoglalás

A platform e-mail/jelszó alapú regisztrációt és Google OAuth bejelentkezést támogat.  
A jelszavak bcrypt titkosítással tárolódnak. E-mail visszaigazolás szükséges egyes funkciókhoz.

---

## Felhasználói Történetek

- **US-01-A**: Mint látogató, szeretnék fiókot létrehozni e-mail és jelszó megadásával, hogy hozzáférjek az örökbefogadási funkciókhoz.
- **US-01-B**: Mint regisztrált felhasználó, szeretnék bejelentkezni, hogy folytassam a munkámat.
- **US-01-C**: Mint felhasználó, szeretnék Google-fiókkal bejelentkezni, hogy ne kelljen jelszót megjegyeznem.
- **US-01-D**: Mint felhasználó, szeretném visszaállítani az elfelejtett jelszavamat e-mailen keresztül.
- **US-01-E**: Mint bejelentkezett felhasználó, szeretnék kijelentkezni, hogy biztonságban maradjanak az adataim.

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
