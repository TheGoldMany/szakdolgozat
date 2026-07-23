# 13 – Profil és felhasználói beállítások

## Összefoglalás

Ez a modul fedi le a felhasználói profiloldalt és a hozzá tartozó beállításokat. A `/hu/profile` oldal bejelentkezett felhasználóknak érhető el, és megjeleníti a fiókadatokat (e-mail, szerepkör, regisztráció dátuma, kérelmek száma), a személyes adatok szerkesztő űrlapját (`ProfileForm` – név, telefon, város, cím), az avatar feltöltést (`AvatarUpload`, Vercel Blob tárolóval), a jelszóváltó űrlapot (`ChangePasswordForm` – csak jelszavas fiókoknál), az e-mail értesítési beállításokat, a fióktörlést, a GDPR-adatexportot, valamint a felhasználó saját aktivitását: előfizetések (`SubscriptionsList`), virtuális örökbefogadások (`SponsorshipsList`) és az örökbefogadási előzmények listáját. A profilon a felhasználó a saját Stripe fiókját is kezelheti a „Stripe fiók" szekcióban (csatlakoztatás, regisztráció befejezése, vezérlőpult megnyitása), így az általa indított kampányokhoz adományokat fogadhat. A nyelvváltás a fejléc Globe ikonos nyelvi váltójával történik (hu/en/de/pl), a `next-intl` útválasztással.

---

## Felhasználói Történetek

- **US-13-A**: Mint felhasználó, szeretném megtekinteni a fiókom adatait (e-mail, szerepkör, regisztráció dátuma), hogy átlássam a fiókom állapotát.
- **US-13-B**: Mint felhasználó, szeretném szerkeszteni a személyes adataimat (név, telefon, város, cím), hogy a menhelyek naprakész elérhetőségeket lássanak.
- **US-13-C**: Mint felhasználó, szeretnék profilképet feltölteni, hogy személyesebb legyen a fiókom.
- **US-13-D**: Mint felhasználó, szeretném megváltoztatni a jelszavamat, hogy biztonságban tartsam a fiókomat.
- **US-13-E**: Mint felhasználó, szeretnék nyelvet váltani az oldalon (magyar, angol, német, lengyel), hogy a számomra kényelmes nyelven használjam a platformot.
- **US-13-F**: Mint felhasználó, szeretném a profilomon egy helyen látni a kérelmeimet, előfizetéseimet, virtuális örökbefogadásaimat és az örökbefogadási előzményeimet, hogy átlássam az aktivitásomat.
- **US-13-G**: Mint felhasználó, szeretném a saját Stripe fiókomat a profilomról csatlakoztatni és kezelni, hogy az általam indított kampányokhoz adományokat fogadhassak, és a bevételeimet a Stripe vezérlőpultján áttekinthessem.

---

## Tesztesetek

---

### TC-13-01: Profiloldal megtekintése és hozzáférés-védelem

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` / `User1234!` fiók létezik (seed) |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Kijelentkezve a `/hu/profile` URL a bejelentkezési oldalra irányít át (`/auth/login?callbackUrl=/profile`)
- [ ] Bejelentkezve az oldal betölt: felül az avatar (`AvatarUpload`), a felhasználó neve és e-mail címe
- [ ] A „Fiókadatok" kártya megjeleníti: e-mail cím, szerepkör badge (pl. „Felhasználó" `USER` szerepkörnél), regisztráció dátuma (magyar formátumban, pl. „2026. január 5.")
- [ ] A kérelmek száma link formájában jelenik meg, és a `/hu/applications` oldalra navigál
- [ ] A szerepkör badge `shelter@test.hu`-nál a menhelyi admin, `admin@test.hu`-nál a szuperadmin címkét mutatja
- [ ] Megjelennek a további szekciók: „Személyes adatok", „Jelszóváltás", előfizetések, virtuális örökbefogadások, örökbefogadási előzmények

**Tesztelési lépések:**
1. Kijelentkezett állapotban nyisd meg a `/hu/profile` URL-t – ellenőrizd az átirányítást a bejelentkezésre.
2. Jelentkezz be `user@test.hu` / `User1234!` fiókkal.
3. Navigálj a `/hu/profile` oldalra (fejléc felhasználói menü → Profil).
4. Ellenőrizd, hogy az oldal tetején megjelenik az avatar kör, a név és az e-mail cím.
5. Ellenőrizd a „Fiókadatok" kártyában az e-mail címet, a szerepkör badge-et és a regisztráció dátumát.
6. Kattints a kérelmek számára mutató linkre – ellenőrizd, hogy a `/hu/applications` oldalra navigál.
7. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal és ellenőrizd, hogy a szerepkör badge a menhelyi admin címkét mutatja.

**Elvárt eredmény:**
A profiloldal csak bejelentkezve érhető el. A fiókadatok (e-mail, szerepkör, regisztráció dátuma, kérelmek száma) helyesen jelennek meg, a kérelmek link a kérelmek oldalra visz.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-02: Személyes adatok szerkesztése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `ProfileForm` űrlap a felhasználó aktuális adataival előtöltve jelenik meg: `name` (kötelező), `phone`, `city`, `address`
- [ ] A „Mentés" gomb mindaddig inaktív (`disabled`), amíg az űrlap nem módosult (`isDirty`)
- [ ] 2 karakternél rövidebb név esetén kliensoldali validációs hiba jelenik meg (zod: `min(2)`)
- [ ] Érvényes adatokkal a mentés `PATCH /api/profile` kérést küld, és zöld sikerüzenet jelenik meg
- [ ] A mentett adatok az adatbázisban frissülnek (`name`, `phone`, `address`, `city` mezők), oldalfrissítés után is megmaradnak
- [ ] Bejelentkezés nélkül az API 401-es hibát ad („Bejelentkezés szükséges")
- [ ] Az API a túl hosszú értékeket elutasítja (telefon max. 20, cím max. 200, város max. 100 karakter) – 400-as válasz

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/profile` oldalra.
2. Ellenőrizd, hogy a „Személyes adatok" űrlap mezői előtöltöttek és a mentés gomb inaktív.
3. Töröld ki a nevet és írj be 1 karaktert – kattints a mentésre, ellenőrizd a validációs hibaüzenetet.
4. Írj be érvényes adatokat: név „Teszt Elek", telefon „+36 30 123 4567", város „Budapest", cím „Példa utca 1.".
5. Kattints a „Mentés" gombra.
6. Ellenőrizd, hogy zöld sikerüzenet jelenik meg.
7. Frissítsd az oldalt – ellenőrizd, hogy a mezők az új értékeket mutatják.
8. (Opcionális, API-szinten) Küldj `PATCH /api/profile` kérést kijelentkezve – ellenőrizd a 401-es választ.

**Elvárt eredmény:**
A profiladatok sikeresen menthetők, a validáció kliens- és szerveroldalon is működik, a mentett adatok persistensek. A mentés gomb csak módosítás után aktív.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-03: Profilkép (avatar) feltöltése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` bejelentkezve; rendelkezésre áll egy JPG/PNG tesztkép; Vercel Blob konfigurálva |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az avatar körre húzva az egeret megjelenik a kamera ikon overlay („Kattints a kép módosításához" felirat)
- [ ] Ha nincs kép, az avatar a név kezdőbetűjét mutatja
- [ ] A fájlválasztó csak képformátumokat fogad el (`image/jpeg`, `image/png`, `image/webp`, `image/gif`)
- [ ] Kiválasztás után azonnal lokális előnézet jelenik meg, feltöltés közben töltés-ikon (spinner) látható
- [ ] A kép a Vercel Blob tárolóba kerül (`/api/upload/avatar` handler), majd a `PATCH /api/profile/avatar` menti az URL-t a `user.image` mezőbe
- [ ] Sikeres feltöltés után a NextAuth session frissül, a fejlécben az avatar azonnal (oldalfrissítés nélkül) lecserélődik
- [ ] Hiba esetén piros hibaüzenet jelenik meg („Feltöltés sikertelen, próbáld újra.") és visszaáll a korábbi kép
- [ ] Oldalfrissítés után az új avatar megmarad

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/profile` oldalra.
2. Vidd az egeret az avatar kör fölé – ellenőrizd a kamera ikon overlay megjelenését.
3. Kattints az avatarra és válassz ki egy JPG tesztképet.
4. Ellenőrizd, hogy azonnal megjelenik a lokális előnézet és a töltés-állapot („Feltöltés...").
5. Várd meg a feltöltés végét – ellenőrizd, hogy az avatar az új képet mutatja.
6. Ellenőrizd, hogy a fejléc jobb felső sarkában lévő felhasználói avatar is frissült oldalfrissítés nélkül.
7. Frissítsd az oldalt – ellenőrizd, hogy az új kép megmaradt.
8. (Negatív eset) Próbálj nem kép fájlt választani – ellenőrizd, hogy a fájlválasztó nem ajánlja fel / a feltöltés elutasításra kerül.

**Elvárt eredmény:**
A profilkép sikeresen feltölthető, a `user.image` mező frissül, a fejléc avatar azonnal lecserélődik, az állapot persistens. Hibás feltöltésnél hibaüzenet jelenik meg és visszaáll a korábbi kép.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-04: Jelszóváltás a profiloldalon

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` / `User1234!` bejelentkezve (jelszavas fiók, nem social login) |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Jelszóváltás" szekció (`ChangePasswordForm`) csak jelszavas fiókoknál jelenik meg (social login fióknál nem)
- [ ] Az űrlap mezői: jelenlegi jelszó, új jelszó, új jelszó megerősítése; a szem ikonnal a jelszó láthatóvá tehető
- [ ] Ha az új jelszó és a megerősítés nem egyezik, kliensoldali hibaüzenet jelenik meg
- [ ] 8 karakternél rövidebb új jelszó esetén hibaüzenet jelenik meg
- [ ] Hibás jelenlegi jelszó esetén az API 400-as hibát ad („A jelenlegi jelszó helytelen.")
- [ ] Helyes adatokkal a `POST /api/auth/change-password` sikeres, sikerüzenet jelenik meg, a mezők kiürülnek
- [ ] Az új jelszó bcrypt hash-elve tárolódik; a régi jelszóval többé nem, az újjal igen lehet bejelentkezni

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/profile` oldalra.
2. Görgess a „Jelszóváltás" szekcióhoz.
3. (Negatív eset) Add meg: jelenlegi `User1234!`, új `Ujjelszo1!`, megerősítés `Masjelszo1!` – ellenőrizd a „nem egyezik" hibaüzenetet.
4. (Negatív eset) Add meg új jelszónak: `Rovid1` (6 karakter) – ellenőrizd a „legalább 8 karakter" hibaüzenetet.
5. (Negatív eset) Add meg jelenlegi jelszónak: `Rossz1234!`, új jelszónak kétszer `Ujjelszo1!` – ellenőrizd a „A jelenlegi jelszó helytelen." hibaüzenetet.
6. Add meg helyesen: jelenlegi `User1234!`, új jelszó és megerősítés `Ujjelszo1!` – küldd el.
7. Ellenőrizd a sikerüzenetet és hogy a mezők kiürültek.
8. Jelentkezz ki, majd próbálj bejelentkezni a régi `User1234!` jelszóval – ellenőrizd, hogy sikertelen.
9. Jelentkezz be az új `Ujjelszo1!` jelszóval – ellenőrizd, hogy sikeres.
10. (Visszaállítás) Változtasd vissza a jelszót `User1234!`-re a további tesztekhez.

**Elvárt eredmény:**
A jelszóváltás minden validációval helyesen működik: egyezés-ellenőrzés, minimum hossz, jelenlegi jelszó ellenőrzése. Sikeres váltás után csak az új jelszóval lehet bejelentkezni.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-05: Nyelvváltás a fejléc nyelvi váltójával

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | Nincs (kijelentkezve is tesztelhető) |
| **URL** | Bármely publikus oldal, pl. `/hu` vagy `/hu/animals` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A fejlécben Globe ikonnal megjelenik a nyelvi váltó az aktuális nyelvvel (pl. „🇭🇺 Magyar")
- [ ] A lenyíló menü a `next-intl` `routing.locales` szerinti 4 nyelvet listázza: Magyar 🇭🇺, English 🇬🇧, Deutsch 🇩🇪, Polski 🇵🇱
- [ ] Az aktuális nyelv a listában kiemelt (félkövér, brand szín)
- [ ] Nyelvváltáskor az URL locale prefixe megváltozik (pl. `/hu/animals` → `/en/animals`), az oldal ugyanazon az útvonalon marad
- [ ] A query paraméterek nyelvváltáskor megmaradnak (pl. szűrők a `/hu/animals?type=DOG` oldalon)
- [ ] Az oldal statikus szövegei (navigáció, gombok, címek) a kiválasztott nyelven jelennek meg
- [ ] A nyelvváltó mobil nézetben is elérhető

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra (tetszőleges szűrővel, pl. `?type=DOG`).
2. Kattints a fejlécben a Globe ikonos nyelvi váltóra – ellenőrizd, hogy lenyílik a 4 nyelv (Magyar, English, Deutsch, Polski) zászlókkal.
3. Ellenőrizd, hogy a „Magyar" kiemelt (aktuális nyelv).
4. Válaszd az „English" opciót.
5. Ellenőrizd, hogy az URL `/en/animals`-ra változott és a query paraméter megmaradt.
6. Ellenőrizd, hogy a navigáció és az oldal szövegei angolul jelennek meg.
7. Válts „Deutsch", majd „Polski" nyelvre – ellenőrizd az URL prefixet és a fordításokat.
8. Válts vissza „Magyar" nyelvre – ellenőrizd, hogy minden visszaáll magyarra.
9. Szűkítsd a böngészőablakot mobil méretre – ellenőrizd, hogy a nyelvváltó a mobil menüben is elérhető.

**Elvárt eredmény:**
A nyelvváltó mind a 4 nyelvet (hu/en/de/pl) felkínálja, váltáskor az URL locale prefixe és az oldal szövegei megváltoznak, miközben az útvonal és a query paraméterek megmaradnak.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-06: Saját aktivitás megjelenítése a profilon

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Előfeltétel** | `user@test.hu` bejelentkezve; a seed adatok közt van a felhasználóhoz tartozó előfizetés, virtuális örökbefogadás és/vagy `APPROVED` örökbefogadási kérelem |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Előfizetéseim" szekció (`SubscriptionsList`) listázza a felhasználó havi támogatásait: csomag neve, összeg, menhely neve, státusz, kezdés dátuma
- [ ] A „Virtuális örökbefogadásaim" szekció (`SponsorshipsList`) listázza a szponzorálásokat: állat neve, összeg, státusz
- [ ] Az „Örökbefogadási előzmények" szekció a felhasználó `APPROVED` státuszú kérelmeit listázza: állat fotója (elsődleges kép), neve, menhely neve, örökbefogadás dátuma
- [ ] Az előzmény-elemre kattintva az állat adatlapjára (`/hu/animals/[slug]`) navigál
- [ ] Üres listák esetén barátságos üres állapot jelenik meg (pl. „Még nincs örökbefogadásod")
- [ ] A listák a legfrissebb elemmel kezdődnek (csökkenő dátum szerinti rendezés)

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/profile` oldalra.
2. Görgess az „Előfizetéseim" szekcióhoz – ellenőrizd a listaelemek tartalmát (csomag, összeg, menhely, státusz).
3. Görgess a „Virtuális örökbefogadásaim" szekcióhoz – ellenőrizd az állatnevet és összeget.
4. Görgess az „Örökbefogadási előzmények" szekcióhoz – ellenőrizd, hogy csak `APPROVED` kérelmek állatai jelennek meg, fotóval és dátummal.
5. Kattints egy előzmény-elemre – ellenőrizd, hogy az állat adatlapjára navigál.
6. (Üres állapot) Jelentkezz be egy frissen regisztrált fiókkal és ellenőrizd az üres állapot szövegeket a szekciókban.

**Elvárt eredmény:**
A profilon a felhasználó teljes aktivitása megjelenik: előfizetések, virtuális örökbefogadások és örökbefogadási előzmények. A linkek a megfelelő oldalakra visznek, üres listáknál üres állapot látható.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-07: Saját Stripe fiók csatlakoztatása a profilról

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` / `User1234!` bejelentkezve; a felhasználónak még NINCS csatlakoztatott Stripe fiókja; a Stripe Connect konfigurálva van (teszt módban) |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A profiloldalon megjelenik a „Stripe fiók" szekció
- [ ] Csatlakoztatatlan állapotban a szekció egy „Stripe fiók csatlakoztatása" gombot mutat
- [ ] A gombra kattintva `POST /api/stripe/connect/onboard` kérés indul `{ type: "user" }` payloaddal
- [ ] A sikeres válasz után a felhasználó a Stripe onboarding (regisztrációs) folyamatához irányítódik
- [ ] Befejezetlen onboarding esetén a szekció a „Regisztráció befejezése" gombot mutatja (nem az „aktív" állapotot)
- [ ] A Stripe onboarding sikeres befejezése után a szekció a zöld „aktív" státuszra vált
- [ ] Az aktív állapot lehetővé teszi, hogy a felhasználó az általa indított kampányokhoz adományokat fogadjon

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/profile` oldalra.
2. Görgess a „Stripe fiók" szekcióhoz – ellenőrizd, hogy a „Stripe fiók csatlakoztatása" gomb jelenik meg (csatlakoztatatlan állapot).
3. Kattints a „Stripe fiók csatlakoztatása" gombra.
4. Ellenőrizd (DevTools → Network), hogy `POST /api/stripe/connect/onboard` indul `{ type: "user" }` payloaddal.
5. Ellenőrizd, hogy a rendszer a Stripe onboarding folyamatához irányít.
6. (Befejezetlen eset) Szakítsd meg az onboardingot és térj vissza a profilra – ellenőrizd, hogy a szekció a „Regisztráció befejezése" gombot mutatja.
7. Fejezd be a Stripe onboardingot (teszt adatokkal) és térj vissza a profilra.
8. Ellenőrizd, hogy a „Stripe fiók" szekció zöld „aktív" státuszra váltott.

**Elvárt eredmény:**
A felhasználó a profilról elindíthatja a saját Stripe fiókja csatlakoztatását (`type: "user"`). Befejezetlen onboarding esetén a „Regisztráció befejezése" gomb jelenik meg, sikeres befejezés után pedig a zöld „aktív" státusz, amellyel a felhasználó adományokat fogadhat a kampányaihoz.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-13-08: Stripe vezérlőpult megnyitása csatlakoztatott fiókkal

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` / `User1234!` bejelentkezve; a felhasználónak MÁR van csatlakoztatott, aktív Stripe fiókja (TC-13-07 lefutott) |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Csatlakoztatott, aktív fiók esetén a „Stripe fiók" szekció zöld „aktív" státuszt és egy „Stripe vezérlőpult megnyitása" gombot mutat
- [ ] A gombra kattintva `POST /api/stripe/connect/dashboard` kérés indul a felhasználó saját fiókjára (a végpont a menhelyek mellett a felhasználó saját fiókját is támogatja)
- [ ] A sikeres válasz egy Stripe Express dashboard bejelentkezési linket ad vissza, amely megnyílik (a Stripe Express vezérlőpultjára navigál)
- [ ] Az „aktív" állapotban NEM jelenik meg a „Stripe fiók csatlakoztatása" vagy a „Regisztráció befejezése" gomb

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj a `/hu/profile` oldalra.
2. Görgess a „Stripe fiók" szekcióhoz – ellenőrizd a zöld „aktív" státuszt és a „Stripe vezérlőpult megnyitása" gombot.
3. Ellenőrizd, hogy nem jelenik meg a „Stripe fiók csatlakoztatása" vagy a „Regisztráció befejezése" gomb.
4. Kattints a „Stripe vezérlőpult megnyitása" gombra.
5. Ellenőrizd (DevTools → Network), hogy `POST /api/stripe/connect/dashboard` indul a felhasználó saját fiókjára.
6. Ellenőrizd, hogy a Stripe Express vezérlőpult bejelentkezési linkje megnyílik.

**Elvárt eredmény:**
Aktív, csatlakoztatott Stripe fiók esetén a felhasználó a profilról megnyithatja a saját Stripe Express vezérlőpultját a `POST /api/stripe/connect/dashboard` végponton keresztül, amely a felhasználó saját fiókját is támogatja.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
