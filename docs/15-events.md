# 15 – Események

## Összefoglalás

Ez a modul fedi le a menhelyi események kezelését. A publikus `/hu/events` oldal a `PUBLISHED` státuszú, jövőbeli eseményeket listázza kártyákon (típus badge, dátum, helyszín, létszám), a részletoldal (`/hu/events/[slug]`) pedig a teljes leírást és a jelentkezési lehetőséget mutatja. Bejelentkezett felhasználó az `EventRegisterButton` komponensen keresztül jelentkezhet (kísérők száma 0–20, opcionális megjegyzés), illetve lemondhatja a részvételét. Az esemény típusai (`EventType`): `ADOPTION_DAY`, `FUNDRAISER`, `VOLUNTEER_DAY`, `OPEN_DAY`, `EDUCATION`, `OTHER`; státuszai (`EventStatus`): `DRAFT` (Vázlat), `PUBLISHED` (Közzétéve), `CANCELLED` (Lemondva), `COMPLETED` (Lezárult). Az admin a `/dashboard/events` oldalon az `EventsManager` komponenssel hozhat létre, szerkeszthet, tehet közzé, mondhat le és törölhet eseményeket, valamint megtekintheti a jelentkezőket. A kapacitáskorlát (`capacity`) a jelentkezőket és kísérőiket együtt számolja; lemondáskor a jelentkezés `CANCELLED` státuszra vált, az admin értesítést és a jelentkezők lemondáskor e-mailt is kapnak.

---

## Felhasználói Történetek

- **US-15-A**: Mint látogató, szeretném listában böngészni a közelgő menhelyi eseményeket, hogy megtaláljam a számomra érdekeseket.
- **US-15-B**: Mint látogató, szeretném megnézni egy esemény részleteit (időpont, helyszín, leírás, szabad helyek), hogy eldönthessem, részt veszek-e.
- **US-15-C**: Mint bejelentkezett felhasználó, szeretnék jelentkezni egy eseményre kísérőim számának megadásával, hogy a menhely tudjon a létszámról.
- **US-15-D**: Mint jelentkezett felhasználó, szeretném lemondani a részvételemet, ha mégsem tudok elmenni.
- **US-15-E**: Mint menhelyi admin, szeretnék eseményeket létrehozni, szerkeszteni, közzétenni és lemondani, hogy szervezhessem a menhely programjait.
- **US-15-F**: Mint menhelyi admin, szeretném látni az eseményre jelentkezők listáját és létszámát, hogy felkészülhessek a rendezvényre.
- **US-15-G**: Mint menhelyi admin, szeretnék kapacitáskorlátot beállítani, hogy ne jelentkezhessenek többen, mint ahány férőhely van.

---

## Tesztesetek

---

### TC-15-01: Publikus eseménylista megjelenítése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | A seed adatok közt van legalább egy `PUBLISHED`, jövőbeli esemény, valamint `DRAFT` és/vagy múltbeli esemény |
| **URL** | `/hu/events` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal bejelentkezés nélkül is elérhető
- [ ] Csak `PUBLISHED` státuszú ÉS jövőbeli (`startsAt >= most`) események jelennek meg; `DRAFT`, `CANCELLED` és múltbeli események nem
- [ ] Az események kezdési idő szerint növekvő sorrendben listázódnak
- [ ] Minden kártyán megjelenik: borítókép (vagy placeholder), típus badge (pl. „Örökbefogadási nap", „Adománygyűjtés", „Önkéntes nap", „Nyílt nap", „Oktatás / előadás", „Egyéb"), kezdés dátuma és időpontja, cím, helyszín, menhely neve és városa
- [ ] Kapacitásos eseménynél „X / Y" formátumban jelenik meg a jelentkezők száma / kapacitás; korlátlan eseménynél csak a jelentkezőszám
- [ ] A kártyára kattintva az esemény részletoldalára (`/hu/events/[slug]`) navigál
- [ ] Ha nincs közelgő esemény, üres állapot jelenik meg

**Tesztelési lépések:**
1. Kijelentkezett állapotban navigálj a `/hu/events` oldalra.
2. Ellenőrizd, hogy az események listázódnak, kezdési idő szerint növekvő sorrendben.
3. Ellenőrizd egy kártya tartalmát: kép, típus badge, dátum (magyar formátum), cím, helyszín, menhely neve · város.
4. Ellenőrizd, hogy `DRAFT` státuszú esemény (admin felületen ellenőrizhető) nem jelenik meg a listában.
5. Ellenőrizd egy kapacitásos eseménynél az „X / Y" létszám-kijelzést.
6. Kattints egy kártyára – ellenőrizd, hogy a `/hu/events/[slug]` részletoldalra navigál.
7. (Üres állapot) Ha nincs közelgő esemény, ellenőrizd az üres állapot megjelenését.

**Elvárt eredmény:**
A lista csak a közzétett, jövőbeli eseményeket mutatja időrendben, teljes kártya-tartalommal. A kártya a részletoldalra visz.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-15-02: Esemény részletoldal megjelenítése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Létezik `PUBLISHED` jövőbeli esemény; létezik `DRAFT` esemény (slug ismert); létezik múltbeli vagy `CANCELLED` esemény |
| **URL** | `/hu/events/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A részletoldal megjeleníti: hero kép, típus badge, cím, teljes leírás („Az eseményről" kártya), breadcrumb vissza az eseménylistára
- [ ] Az oldalsávban megjelenik: kezdés (hét napja + teljes dátum + időpont), befejezés (ha van `endsAt`), helyszín, menhely (linkkel a `/hu/shelters/[slug]` oldalra), létszám („X / Y" vagy résztvevőszám)
- [ ] A létszám a kísérőket is tartalmazza (jelentkezők + `guests` összege)
- [ ] `DRAFT` státuszú esemény slug-jára navigálva 404-es oldal jelenik meg
- [ ] `CANCELLED` eseménynél piros figyelmeztető sáv jelenik meg, jelentkezési lehetőség nélkül
- [ ] Múltbeli eseménynél a jelentkezés helyett „lezajlott" üzenet jelenik meg
- [ ] Kijelentkezett látogatónak a jelentkezés helyett bejelentkezésre hívó doboz jelenik meg, amely a `callbackUrl`-lel a bejelentkezésre visz

**Tesztelési lépések:**
1. Navigálj egy `PUBLISHED` esemény részletoldalára kijelentkezve.
2. Ellenőrizd a fő tartalmat: kép, típus badge, cím, leírás, breadcrumb.
3. Ellenőrizd az oldalsáv adatait: kezdés, befejezés, helyszín, menhely link, létszám.
4. Kattints a menhely linkjére – ellenőrizd, hogy a menhely adatlapjára navigál.
5. Ellenőrizd, hogy kijelentkezve a „jelentkezéshez jelentkezz be" doboz jelenik meg; kattints a bejelentkezés gombra és ellenőrizd a visszairányítást az eseményre.
6. Nyiss meg egy `DRAFT` esemény URL-t – ellenőrizd a 404-es oldalt.
7. Nyiss meg egy `CANCELLED` eseményt – ellenőrizd a piros „elmaradt" figyelmeztetést.
8. Nyiss meg egy múltbeli eseményt – ellenőrizd a „lezajlott" üzenetet és hogy nincs jelentkezési gomb.

**Elvárt eredmény:**
A részletoldal minden adatot helyesen mutat. Vázlat esemény nem érhető el (404), lemondott és múltbeli eseménynél a megfelelő üzenetek jelennek meg, kijelentkezve bejelentkezésre hív.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-15-03: Jelentkezés eseményre

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `user@test.hu` bejelentkezve; létezik `PUBLISHED`, jövőbeli, szabad kapacitású esemény, amelyre a felhasználó még nem jelentkezett |
| **URL** | `/hu/events/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Bejelentkezve megjelenik a „Jelentkezem" gomb (`EventRegisterButton`); kattintásra jelentkezési űrlap nyílik
- [ ] Az űrlapon megadható a kísérők száma (0–20 közötti szám) és opcionális megjegyzés (max. 1000 karakter)
- [ ] A kísérőszám mellett tájékoztató szöveg mutatja az összlétszámot (1 + kísérők)
- [ ] Beküldéskor `POST /api/events/[id]/register` hívás történik; `EventRegistration` rekord jön létre `REGISTERED` státusszal, a megadott `guests` és `note` értékekkel
- [ ] Sikeres jelentkezés után a sidebar zöld „jelentkeztél" dobozra vált, a létszám-kijelzés frissül (1 + kísérők hozzáadva)
- [ ] A menhely adminjai `EVENT_REGISTRATION` típusú értesítést kapnak („Új esemény-jelentkezés"), amely a `/dashboard/events` oldalra mutat
- [ ] A jelentkező visszaigazoló e-mailt kap az esemény címével, időpontjával és helyszínével
- [ ] Ugyanarra az eseményre nem jön létre duplikált jelentkezés (egyedi `eventId + userId` kulcs, upsert)

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj egy szabad kapacitású, közzétett esemény oldalára.
2. Kattints a „Jelentkezem" gombra – ellenőrizd, hogy megnyílik az űrlap.
3. Add meg a kísérők számát: 2, és írj megjegyzést: „Kutyával érkezünk."
4. Ellenőrizd, hogy a tájékoztató szöveg 3 fős összlétszámot jelez.
5. Küldd el a jelentkezést.
6. Ellenőrizd, hogy a sidebar zöld megerősítő dobozra váltott, és a létszám-kijelzés 3-mal nőtt.
7. Frissítsd az oldalt – ellenőrizd, hogy a jelentkezett állapot megmaradt.
8. Jelentkezz be `shelter@test.hu` fiókkal – ellenőrizd az „Új esemény-jelentkezés" értesítést a csengőben.
9. Ellenőrizd a `/dashboard/events` oldalon a „Jelentkezők" listában a `user@test.hu` jelentkezését a megjegyzéssel és „3 fő" jelöléssel.
10. (Ha e-mail tesztelhető) Ellenőrizd a visszaigazoló e-mail megérkezését.

**Elvárt eredmény:**
A jelentkezés a kísérőszámmal és megjegyzéssel sikeresen rögzül, a felület és a létszám frissül, az admin értesítést, a jelentkező e-mailt kap. Duplikált jelentkezés nem jön létre.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-15-04: Jelentkezés lemondása és újrajelentkezés

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `user@test.hu` bejelentkezve és aktív (`REGISTERED`) jelentkezése van egy közzétett eseményre (TC-15-03) |
| **URL** | `/hu/events/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A jelentkezett állapotú dobozban megjelenik a „részvétel lemondása" gomb
- [ ] A lemondás előtt megerősítő kérdés (confirm) jelenik meg
- [ ] Megerősítés után `DELETE /api/events/[id]/register` hívás történik; a jelentkezés státusza `CANCELLED`-re vált (a rekord nem törlődik)
- [ ] A felület visszavált a „Jelentkezem" gombra, a létszám-kijelzés csökken (a kísérőkkel együtt)
- [ ] Az admin felület „Jelentkezők" listájában a lemondott jelentkezés már nem szerepel az aktívak közt
- [ ] Lemondás után a felhasználó újra tud jelentkezni ugyanarra az eseményre (upsert: a meglévő rekord `REGISTERED`-re vált vissza)
- [ ] Jelentkezés nélküli lemondási kérés 404-es hibát ad („Nincs jelentkezésed")

**Tesztelési lépések:**
1. Jelentkezz be `user@test.hu` / `User1234!` fiókkal és navigálj arra az eseményre, amelyre jelentkeztél.
2. Kattints a „részvétel lemondása" gombra.
3. A megerősítő kérdésnél először válassz „Mégsem"-et – ellenőrizd, hogy a jelentkezés megmaradt.
4. Kattints újra és erősítsd meg a lemondást.
5. Ellenőrizd, hogy a felület visszaváltott a „Jelentkezem" gombra és a létszám csökkent.
6. Ellenőrizd az adatbázisban / admin felületen, hogy a jelentkezés `CANCELLED` státuszú.
7. Jelentkezz újra ugyanarra az eseményre 0 kísérővel – ellenőrizd, hogy sikeres, és a státusz visszaállt `REGISTERED`-re.
8. (API, negatív eset) Küldj `DELETE /api/events/[id]/register` kérést olyan eseményre, amelyre nincs jelentkezésed – ellenőrizd a 404-es választ.

**Elvárt eredmény:**
A lemondás megerősítés után `CANCELLED` státuszra állítja a jelentkezést, a létszám csökken, és a felhasználó később újra jelentkezhet ugyanarra az eseményre.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-15-05: Kapacitáskorlát betartatása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Létezik (vagy admin által létrehozható) kis kapacitású (pl. `capacity: 2`) közzétett esemény; két felhasználói fiók elérhető |
| **URL** | `/hu/events/[slug]`, `POST /api/events/[id]/register` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A kapacitás-számítás a jelentkezőket ÉS kísérőiket együtt számolja (fő = jelentkezések + `guests` összege)
- [ ] Ha a kapacitás betelt, a részletoldalon a jelentkezési gomb helyett „betelt" üzenet jelenik meg
- [ ] Betelt eseményre küldött jelentkezési API-kérés 409-es hibát ad („Az esemény betelt")
- [ ] Olyan jelentkezés, amely a kísérőkkel együtt lépné túl a kapacitást, szintén 409-es hibával elutasításra kerül
- [ ] Már jelentkezett felhasználó a saját jelentkezése módosításakor (újrajelentkezés) nem számít duplán a kapacitásba
- [ ] `CANCELLED` jelentkezések nem foglalnak helyet; lemondás után felszabadul a hely és más jelentkezhet
- [ ] A listaoldalon és a részletoldalon a „X / Y" kijelzés a betelt állapotot tükrözi

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` fiókkal és hozz létre a `/dashboard/events` oldalon egy eseményt 2 fős létszámkorláttal, majd tedd közzé.
2. Jelentkezz be `user@test.hu` fiókkal és jelentkezz az eseményre 1 kísérővel (összesen 2 fő).
3. Ellenőrizd, hogy a részletoldalon a létszám „2 / 2".
4. Jelentkezz be egy másik felhasználói fiókkal és nyisd meg az eseményt – ellenőrizd, hogy a „betelt" üzenet jelenik meg jelentkezési gomb helyett.
5. (API) Küldj jelentkezési kérést a második fiókkal – ellenőrizd a 409-es választ („Az esemény betelt").
6. A `user@test.hu` fiókkal mondd le a részvételt – ellenőrizd, hogy a létszám „0 / 2"-re csökkent.
7. A második fiókkal jelentkezz újra – ellenőrizd, hogy most sikeres.
8. (Határeset) Próbálj 1 szabad hely mellett 1 kísérővel (2 fő igénnyel) jelentkezni – ellenőrizd a 409-es elutasítást.

**Elvárt eredmény:**
A kapacitáskorlát a kísérőkkel együtt számolva kikényszerített: betelt eseményre sem felületről, sem API-ról nem lehet jelentkezni, lemondás után a hely felszabadul.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-15-06: Admin esemény létrehozása és szerkesztése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN, menhelyhez rendelve) |
| **URL** | `/dashboard/events` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az „Új esemény" gombra kattintva megnyílik az űrlap a mezőkkel: Cím*, Típus* (6 opció: Örökbefogadási nap, Adománygyűjtés, Önkéntes nap, Nyílt nap, Oktatás / előadás, Egyéb), Helyszín*, Kezdés* (datetime), Befejezés, Létszámkorlát (üres = korlátlan), Kép URL, Leírás*
- [ ] Két mentési mód érhető el: „Mentés vázlatként" (`DRAFT`) és „Mentés és közzététel" (`PUBLISHED`)
- [ ] A kezdés előtti befejezési időpontot az API elutasítja („A befejezés nem lehet a kezdés előtt", 400)
- [ ] Létrehozáskor egyedi, ékezetmentes slug generálódik a címből (pl. „Tavaszi nap" → `tavaszi-nap-xxxxxxxx`)
- [ ] A vázlatként mentett esemény nem jelenik meg a publikus `/hu/events` listán; a közzétett igen
- [ ] A ceruza ikonnal megnyitható a szerkesztő űrlap, előtöltött adatokkal; a módosítás `PATCH /api/events/[id]` kéréssel mentődik
- [ ] Közzétett esemény időpontjának vagy helyszínének módosításakor a jelentkezők `EVENT_UPDATED` értesítést kapnak („Esemény módosítva"), az esemény oldalára mutató linkkel
- [ ] Nem a saját menhelyhez tartozó eseményt a SHELTER_ADMIN nem módosíthat (403, „Nincs jogosultságod"); SUPER_ADMIN bármelyiket kezelheti

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal és navigálj a `/dashboard/events` oldalra.
2. Kattints az „Új esemény" gombra és töltsd ki az űrlapot: cím „Tavaszi örökbefogadási nap", típus „Örökbefogadási nap", helyszín, jövőbeli kezdés, létszámkorlát 50, leírás.
3. (Negatív eset) Állíts a kezdésnél korábbi befejezést és ments – ellenőrizd a hibaüzenetet.
4. Javítsd a befejezést és kattints a „Mentés vázlatként" gombra.
5. Ellenőrizd, hogy az esemény „Vázlat" badge-dzsel megjelenik a listában, de a publikus `/hu/events` oldalon NEM.
6. Kattints a ceruza ikonra, módosítsd a címet és mentsd „Mentés és közzététel" gombbal.
7. Ellenőrizd, hogy a státusz „Közzétéve" lett és az esemény megjelenik a publikus listán.
8. Jelentkezz az eseményre `user@test.hu` fiókkal, majd adminként módosítsd az esemény helyszínét.
9. Ellenőrizd, hogy a `user@test.hu` „Esemény módosítva" értesítést kapott, amely az esemény oldalára visz.

**Elvárt eredmény:**
Az esemény vázlatként és közzétéve is létrehozható, a validáció és a slug-generálás működik, a szerkesztés menthető, és a kulcsadatok (időpont/helyszín) változásáról a jelentkezők értesítést kapnak.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-15-07: Admin státuszkezelés, lemondás, törlés és résztvevők listája

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; létezik közzétett esemény legalább egy aktív jelentkezővel (`user@test.hu`) |
| **URL** | `/dashboard/events` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az eseménykártyán a státusznak megfelelő műveleti gombok jelennek meg: `DRAFT` → „Közzététel"; `PUBLISHED` → „Visszavonás vázlatba", „Lezárás", „Lemondás"; `CANCELLED`/`COMPLETED` → „Újranyitás (vázlat)"
- [ ] A „Jelentkezők (N)" gombbal lenyitható a résztvevőlista: név, e-mail, megjegyzés (idézve), összlétszám („X fő" = 1 + kísérők); a számláló csak a `REGISTERED` jelentkezéseket tartalmazza
- [ ] „Lemondás" esetén az esemény `CANCELLED` státuszra vált; minden aktív jelentkező `EVENT_CANCELLED` értesítést („Esemény lemondva") ÉS lemondó e-mailt kap
- [ ] A lemondott esemény részletoldalán piros figyelmeztetés jelenik meg, jelentkezni nem lehet (409 az API-n)
- [ ] „Lezárás" a státuszt `COMPLETED`-re állítja; a publikus listán nem jelenik meg
- [ ] A törlés (kuka ikon) megerősítést kér („Biztosan törlöd az eseményt? A jelentkezések is törlődnek."), majd a `DELETE /api/events/[id]` véglegesen törli az eseményt a jelentkezésekkel együtt (cascade)
- [ ] Törlés után az esemény URL-je 404-et ad
- [ ] `user@test.hu` (sima felhasználó) számára az admin API-műveletek 403/401 hibát adnak

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal és navigálj a `/dashboard/events` oldalra.
2. Egy közzétett eseménynél kattints a „Jelentkezők (N)" gombra – ellenőrizd a lenyíló listában a `user@test.hu` nevét, e-mailjét, megjegyzését és a fő-számot.
3. Kattints a „Lemondás" gombra – ellenőrizd, hogy a státusz badge „Lemondva" (piros) lett.
4. Ellenőrizd, hogy `user@test.hu` megkapta az „Esemény lemondva" értesítést (és ha tesztelhető, az e-mailt).
5. Nyisd meg az esemény publikus oldalát – ellenőrizd a piros „elmaradt" sávot és hogy nincs jelentkezési lehetőség.
6. Kattints az „Újranyitás (vázlat)" gombra – ellenőrizd, hogy a státusz „Vázlat" lett.
7. Tedd közzé újra, majd kattints a „Lezárás" gombra – ellenőrizd a „Lezárult" státuszt és hogy a publikus listán nem szerepel.
8. Kattints a kuka ikonra – először vesd el a megerősítést, majd erősítsd meg a törlést.
9. Ellenőrizd, hogy az esemény eltűnt a listából és a publikus URL-je 404-et ad.
10. (API, negatív eset) `user@test.hu` fiókkal küldj `PATCH /api/events/[id]` kérést egy eseményre – ellenőrizd a 403-as választ.

**Elvárt eredmény:**
A státusz-életciklus (Vázlat → Közzétéve → Lemondva/Lezárult → újranyitás) gombokkal kezelhető, lemondáskor a jelentkezők értesítést és e-mailt kapnak, a törlés megerősítés után végleges, a jogosultságok kikényszerítettek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
