# 16 – Űrlapszerkesztő, férőhelyek és áthelyezések

## Összefoglalás

Ez a modul három, menhelyi adminisztrációhoz kötődő funkciót fed le. (1) **Kérvénysablon-szerkesztő (form builder)**: a menhely admin a `/dashboard/forms` oldalon egyedi örökbefogadási kérdőíveket állíthat össze a `FormBuilder` komponenssel (mezőtípusok: `TEXT`, `TEXTAREA`, `IMAGE`, `FILE`). A sablon `DRAFT` → `PENDING_APPROVAL` → `APPROVED`/`REJECTED` státusz-folyamaton megy át (jóváhagyó: SUPER_ADMIN), a jóváhagyott sablon a beszélgetésből küldött meghívóval (`InviteSender`) jut el az örökbefogadóhoz, aki a `/hu/apply/[token]` oldalon tölti ki (`ApplicationFormFiller`). (2) **Férőhelyek (kennelek)**: a `/dashboard/kennels` oldalon a `KennelManager` komponenssel kennel hozható létre típussal és kapacitással, az állatok férőhelyhez rendelhetők, a kapacitás-túllépést a rendszer blokkolja. (3) **Áthelyezések**: az admin a `/dashboard/animals` oldalról áthelyezési kérelmet (`AnimalTransfer`) indíthat másik menhelyre, amelyet a fogadó menhely adminja a `/dashboard/transfers` oldalon hagy jóvá vagy utasít el (`TransferStatus`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`); jóváhagyáskor az állat `shelterId`-ja átkerül a célmenhelyhez.

---

## Felhasználói Történetek

- **US-16-A**: Mint menhely admin, szeretnék egyedi örökbefogadási kérdőívsablont összeállítani saját kérdésekkel, hogy a menhelyem igényeire szabott információkat kérjek be a jelentkezőktől.
- **US-16-B**: Mint menhely admin, szeretném a sablont jóváhagyásra beküldeni, és értesülni a főadmin döntéséről, hogy csak ellenőrzött űrlapok kerüljenek a felhasználók elé.
- **US-16-C**: Mint örökbefogadni vágyó felhasználó, szeretném a menhelytől kapott kérvény-meghívót megnyitni és az űrlapot kitölteni, hogy hivatalos örökbefogadási kérelmet adjak be.
- **US-16-D**: Mint menhely admin, szeretnék férőhelyeket (kennel, macskaszoba, karantén stb.) nyilvántartani kapacitással, hogy átlássam a menhely kihasználtságát.
- **US-16-E**: Mint menhely admin, szeretném az állatokat férőhelyhez rendelni és férőhelyek között mozgatni, hogy mindig tudjam, melyik állat hol van elhelyezve.
- **US-16-F**: Mint menhely admin, szeretnék áthelyezési kérelmet indítani egy állathoz másik menhely felé, hogy túlterheltség esetén az állat jobb helyre kerülhessen.
- **US-16-G**: Mint fogadó menhely adminja, szeretném a bejövő áthelyezési kérelmeket jóváhagyni vagy elutasítani, hogy én dönthessek a menhelyem befogadásairól.

---

## Tesztesetek

---

### TC-16-01: Új kérvénysablon létrehozása és piszkozat mentése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN), a fiók menhelyhez rendelt |
| **URL** | `/dashboard/forms` → `/dashboard/forms/new` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/forms` („Kérvény sablonok") oldal csak SHELTER_ADMIN szerepkörrel érhető el – más szerepkör a `/dashboard`-ra irányít át
- [ ] Az „Új sablon" gomb a `/dashboard/forms/new` oldalra navigál
- [ ] A `FormBuilder` komponens 6 alapértelmezett mezővel töltődik be (pl. „Motiváció / Miért szeretnéd örökbefogadni?" – Bekezdés, kötelező; „Lakástípus (ház / lakás / egyéb)" – Szöveg, kötelező; „Van kert?" stb.)
- [ ] A sablon neve kötelező – üres név esetén „A sablon neve kötelező." hibaüzenet jelenik meg
- [ ] A „Piszkozat mentése" gomb `POST /api/application-forms` hívással létrehozza a sablont `DRAFT` státusszal, és „Piszkozat mentve." üzenet jelenik meg
- [ ] Mentés után a rendszer a `/dashboard/forms/[id]` szerkesztő oldalra navigál
- [ ] A listaoldalon az új sablon „Piszkozat" (szürke) badge-dzsel és a mezők számával („6 mező") jelenik meg

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal.
2. Navigálj a `/dashboard/forms` oldalra – ellenőrizd a „Kérvény sablonok" címet és az „Új sablon" gombot.
3. (Negatív teszt) Jelentkezz be `user@test.hu` fiókkal másik böngészőben, és próbáld megnyitni a `/dashboard/forms` URL-t – ellenőrizd az átirányítást.
4. A `shelter@test.hu` fiókkal kattints az „Új sablon" gombra.
5. Ellenőrizd, hogy a 6 alapértelmezett mező betöltődött a megfelelő típusokkal és kötelezőség-jelöléssel.
6. Hagyd üresen a „Sablon neve" mezőt, és kattints a „Piszkozat mentése" gombra – ellenőrizd „A sablon neve kötelező." hibaüzenetet.
7. Add meg a sablon nevét (pl. „Teszt kérvény 2026") és opcionális leírást.
8. Kattints a „Piszkozat mentése" gombra.
9. Ellenőrizd a „Piszkozat mentve." visszajelzést és az átirányítást a szerkesztő oldalra.
10. Navigálj vissza a `/dashboard/forms` oldalra – ellenőrizd, hogy a sablon „Piszkozat" badge-dzsel és „6 mező" felirattal listázódik.

**Elvárt eredmény:**
A sablon `DRAFT` státusszal létrejön az adatbázisban a megadott címmel és 6 mezővel. A lista a helyes státusz-badge-et és mezőszámot mutatja. Üres név esetén a mentés validációs hibával elutasításra kerül.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-02: Mezők kezelése a form builderben (típusok, sorrend, kötelezőség)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; létezik legalább egy `DRAFT` státuszú sablon (lásd TC-16-01) |
| **URL** | `/dashboard/forms/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Mező hozzáadása" gomb új üres mezőt ad a lista végére (`TEXT` típussal, nem kötelezőként)
- [ ] Minden mezőnél szerkeszthető: Felirat (label), Típus, Kötelező kapcsoló
- [ ] A típusválasztó mind a 4 `FieldType` értéket kínálja magyar felirattal: „Szöveg" (`TEXT`), „Bekezdés" (`TEXTAREA`), „Kép feltöltés" (`IMAGE`), „Fájl feltöltés" (`FILE`)
- [ ] A fel/le nyíl gombokkal (`ChevronUp`/`ChevronDown`) a mező sorrendje változtatható; az első mezőnél a felfelé, az utolsónál a lefelé gomb letiltott
- [ ] A törlés (kuka) gomb eltávolítja a mezőt, és a maradék mezők `order` értéke újraszámozódik
- [ ] Mentés után (`PATCH /api/application-forms/[id]`) a mezők a beállított sorrendben és tulajdonságokkal tárolódnak
- [ ] Oldal-újratöltés után a mezők a mentett állapotot tükrözik (`order` szerint rendezve)

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és nyisd meg a `DRAFT` sablont a `/dashboard/forms/[id]` oldalon.
2. Kattints a „Mező hozzáadása" gombra – ellenőrizd, hogy új üres mező jelenik meg a lista végén.
3. Add meg az új mező feliratát (pl. „Oltási könyv fotója"), és állítsd a típusát „Kép feltöltés"-re.
4. Jelöld be a mező „Kötelező" kapcsolóját.
5. Adj hozzá még egy mezőt „Fájl feltöltés" típussal (pl. „Bérleti szerződés").
6. A fel nyíllal mozgasd az „Oltási könyv fotója" mezőt két hellyel feljebb – ellenőrizd a sorrendváltozást.
7. Ellenőrizd, hogy az első mezőnél a felfelé nyíl letiltott (szürke).
8. Töröld az egyik alapértelmezett mezőt (pl. „Van kert?") a kuka ikonnal.
9. Kattints a „Piszkozat mentése" gombra.
10. Töltsd újra az oldalt – ellenőrizd, hogy a mezők sorrendje, típusa és kötelezősége a mentett állapotot mutatja.

**Elvárt eredmény:**
Mező hozzáadható, törölhető és átrendezhető; mind a 4 mezőtípus választható. A mentés a `FormField` rekordokat a helyes `label`, `type`, `required`, `order` értékekkel tárolja, az állapot újratöltés után is megmarad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-03: Sablon jóváhagyásra küldése és főadmin döntés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` (SHELTER_ADMIN) és `admin@test.hu` (SUPER_ADMIN) bejelentkezhet; létezik `DRAFT` sablon |
| **URL** | `/dashboard/forms/[id]` (menhely admin) → `/dashboard/campaigns` (főadmin jóváhagyás) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Jóváhagyásra küldés" gomb (`POST /api/application-forms/[id]/request-approval`) a sablont `DRAFT` → `PENDING_APPROVAL` státuszra állítja, „Sablon beküldve jóváhagyásra." üzenettel
- [ ] A főadminok `FORM_PENDING_APPROVAL` típusú értesítést kapnak („Kérvénysablon jóváhagyásra vár")
- [ ] `PENDING_APPROVAL` (és bármely nem-`DRAFT`) státuszban a sablon nem szerkeszthető: a mezők letiltottak, az API `409` választ ad („Csak piszkozat állapotban szerkeszthető")
- [ ] A SUPER_ADMIN a jóváhagyási felületen (`FormApprovalActions` komponens) látja a `PENDING_APPROVAL` sablonokat, és jóváhagyhatja (`POST /api/application-forms/[id]/approve`) vagy elutasíthatja (`POST /api/application-forms/[id]/reject`, opcionális indoklással)
- [ ] Jóváhagyáskor a sablon `APPROVED` státuszú lesz, a menhely adminjai `FORM_APPROVED` értesítést kapnak
- [ ] Elutasításkor a sablon `REJECTED` státuszú lesz, az indoklás a leíráshoz fűződik („Elutasítás oka: …"), a menhely adminjai `FORM_REJECTED` értesítést kapnak
- [ ] A jóváhagyás/elutasítás csak SUPER_ADMIN szerepkörrel hívható (más szerepkör: `403`)

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és nyisd meg a `DRAFT` sablont.
2. Kattints a „Jóváhagyásra küldés" gombra – ellenőrizd a sikerüzenetet és az átirányítást a `/dashboard/forms` listára.
3. Ellenőrizd, hogy a sablon badge-e „Jóváhagyásra vár" (sárga) lett.
4. Nyisd meg újra a sablont – ellenőrizd, hogy a cím-, leírás- és mezőszerkesztés letiltott.
5. Jelentkezz be `admin@test.hu` / `Admin1234!` fiókkal (másik böngésző/lap).
6. Ellenőrizd a főadmin értesítését („Kérvénysablon jóváhagyásra vár") a csengő ikonnál.
7. Navigálj a jóváhagyási felületre (`/dashboard/campaigns` – a várakozó kérvénysablonok szekciója), és keresd meg a beküldött sablont.
8. Utasítsd el a sablont indoklással (pl. „Hiányos kérdéssor") – ellenőrizd, hogy a menhely adminnál a sablon „Elutasított" (piros) státuszú, és megérkezett a `FORM_REJECTED` értesítés.
9. (Ismételt kör) A menhely adminnal hozz létre / küldj be egy másik sablont, majd a főadminnal hagyd jóvá.
10. Ellenőrizd, hogy a sablon „Jóváhagyott" (zöld) státuszú lett, és a menhely admin `FORM_APPROVED` értesítést kapott.

**Elvárt eredmény:**
A státusz-folyamat `DRAFT` → `PENDING_APPROVAL` → `APPROVED`/`REJECTED` szerint működik. Nem-piszkozat sablon nem szerkeszthető. Mindkét irányú döntésről értesítés készül, az elutasítási indok a sablon leírásában rögzül.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-04: Jóváhagyott kérdőív kiküldése meghívóként és kitöltése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Létezik `APPROVED` sablon a menhelyhez (TC-16-03); `user@test.hu` és `shelter@test.hu` között létezik beszélgetés egy állatról (a felhasználó korábban üzenetet küldött a menhelynek) |
| **URL** | `/hu/messages/[id]` (admin meghívó) → `/hu/apply/[token]` (kitöltés) |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely admin a beszélgetés oldalán látja a „Kérvény meghívó küldése" panelt (`InviteSender`) a jóváhagyott sablonok legördülő listájával
- [ ] A küldés (`POST /api/conversations/[id]/invite`) létrehoz egy `INVITED` státuszú `AdoptionApplication` rekordot egyedi `inviteToken`-nel, és `INVITE` típusú üzenetet a beszélgetésben
- [ ] Csak `APPROVED` sablonnal küldhető meghívó (nem jóváhagyott sablon esetén: `409` – „Csak jóváhagyott sablon alapján küldhető meghívó")
- [ ] Ha már létezik aktív (`INVITED`/`PENDING`/`REVIEWING`) kérelem az adott állat+felhasználó párosra, a küldés `409`-cel elutasul („Már létezik aktív kérelem ehhez az állathoz")
- [ ] A felhasználó a chatben „Örökbefogadási kérvény meghívó" buborékot lát „Kérvény kitöltése" gombbal, amely a `/hu/apply/[token]` oldalra visz
- [ ] A kitöltő oldalon megjelenik az állat neve/képe, a sablon címe, leírása és az összes mező a sablonban beállított sorrendben (`ApplicationFormFiller`)
- [ ] Kötelező mező üresen hagyásakor a beküldés blokkolt: `A "<mező>" mező kitöltése kötelező.` hibaüzenettel
- [ ] `IMAGE`/`FILE` mezőhöz fájl tölthető fel; sikeres beküldés (`POST /api/apply/[token]`) után „Kérvény sikeresen beküldve!" visszaigazolás jelenik meg
- [ ] A válaszok `FormFieldResponse` rekordként tárolódnak, a kérelem megjelenik az admin `/dashboard/applications` listájában

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és nyisd meg a felhasználóval folytatott beszélgetést a `/hu/messages/[id]` oldalon.
2. A „Kérvény meghívó küldése" panelben válaszd ki a jóváhagyott sablont, és kattints a küldés gombra.
3. Ellenőrizd a „Meghívó sikeresen elküldve!" visszajelzést és az `INVITE` üzenet megjelenését a chatben.
4. Próbálj azonnal újabb meghívót küldeni – ellenőrizd a „Már létezik aktív kérelem…" hibaüzenetet.
5. Jelentkezz be `user@test.hu` / `User1234!` fiókkal, és nyisd meg ugyanazt a beszélgetést.
6. Kattints a „Kérvény kitöltése" gombra az „Örökbefogadási kérvény meghívó" buborékban – ellenőrizd a `/hu/apply/[token]` oldal betöltését az állat adataival és a sablon mezőivel.
7. Hagyd üresen az egyik kötelező mezőt, és kattints a beküldés gombra – ellenőrizd a kötelező-mező hibaüzenetet.
8. Tölts ki minden kötelező mezőt; az `IMAGE`/`FILE` típusú mezőhöz tölts fel egy tesztfájlt, és várd meg a feltöltés befejezését.
9. Küldd be az űrlapot – ellenőrizd a „Kérvény sikeresen beküldve!" képernyőt és a „Vissza az állat profiljához" linket.
10. A `shelter@test.hu` fiókkal ellenőrizd a `/dashboard/applications` oldalon, hogy a kérelem a kitöltött válaszokkal (szöveges értékek + feltöltött fájl linkje) megjelent.

**Elvárt eredmény:**
A meghívó csak jóváhagyott sablonnal és aktív kérelem hiányában küldhető. A token-alapú kitöltő oldal a sablon valós mezőit jeleníti meg, a kötelező mezők validálva vannak, a beküldött válaszok az admin oldalon a kérelemnél visszanézhetők.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-05: Férőhely (kennel) létrehozása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve (SHELTER_ADMIN), a fiók menhelyhez rendelt |
| **URL** | `/dashboard/kennels` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Férőhelyek" oldal betölt a `KennelManager` komponenssel; menhelyhez nem rendelt fióknál figyelmeztető üzenet jelenik meg
- [ ] Az „Új férőhely" gombra kattintva űrlap nyílik: Megnevezés (kötelező), Típus (kötelező), Maximális kapacitás (kötelező, min. 1), Megjegyzés (opcionális)
- [ ] A típusválasztó a `KennelType` enum mind a 6 értékét kínálja magyar felirattal: „Kennel", „Macskaszoba", „Karantén", „Madárház", „Kültéri kifutó", „Egyéb"
- [ ] A „Férőhely létrehozása" gomb `POST /api/kennels` hívással létrehozza a rekordot, amely azonnal megjelenik a kártyarácsban
- [ ] Az új kennel kártyáján látható: név, típusfelirat, „Foglaltság: 0/N", „N szabad" jelzés, üres állatlista („Üres")
- [ ] A kapacitás mező 1-nél kisebb értéket nem fogad el (HTML `min=1` + API validáció: 1–1000)
- [ ] A kennel csak a saját menhelyhez jön létre (SHELTER_ADMIN más menhelyére nem hozhat létre férőhelyet)

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/kennels` oldalra.
2. Kattints az „Új férőhely" gombra – ellenőrizd, hogy az űrlap megnyílik, és a gomb „Mégse" feliratúra vált.
3. Ellenőrizd, hogy a Típus legördülő mind a 6 opciót tartalmazza (Kennel, Macskaszoba, Karantén, Madárház, Kültéri kifutó, Egyéb).
4. Add meg a nevet (pl. „A-1 kennel"), válaszd a „Kennel" típust, állítsd a kapacitást 2-re, írj megjegyzést.
5. Próbáld a kapacitást 0-ra állítani – ellenőrizd, hogy a beviteli mező/validáció ezt nem engedi.
6. Kattints a „Férőhely létrehozása" gombra.
7. Ellenőrizd, hogy az új kennel kártya megjelenik „Foglaltság: 0/2" és „2 szabad" jelzéssel, üres állatlistával.
8. Hozz létre még egy férőhelyet „Karantén" típussal, 1 kapacitással (a TC-16-07-hez).
9. Töltsd újra az oldalt – ellenőrizd, hogy mindkét férőhely megmaradt.

**Elvárt eredmény:**
A férőhely a megadott névvel, típussal és kapacitással létrejön a menhelyhez, a kártya a valós foglaltsági adatokat mutatja. Érvénytelen kapacitás nem menthető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-06: Állat férőhelyhez rendelése és mozgatása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; létezik legalább 2 férőhely (TC-16-05) és legalább 2 nem örökbefogadott állat a menhelyen |
| **URL** | `/dashboard/kennels` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A férőhely nélküli állatok külön szekcióban listázódnak, mindegyiknél legördülővel rendelhető férőhely
- [ ] Az áthelyezés `PATCH /api/animals/[id]/kennel` hívással történik (`kennelId` mezővel); siker esetén az állat átkerül a cél-kennel kártyájára
- [ ] A foglaltsági számláló és a kihasználtsági sáv azonnal frissül (pl. „Foglaltság: 1/2")
- [ ] A kennelben lévő állat a sorában lévő legördülővel másik kennelbe mozgatható, vagy a „— Kivesz —" opcióval férőhely nélkülivé tehető (`kennelId: null`)
- [ ] Az `ADOPTED` státuszú állatok nem jelennek meg a listában (csak a fizikailag jelen lévő állatok)
- [ ] Az állat csak a saját menhely férőhelyére helyezhető (másik menhely kennelje: `400` – „A férőhely másik menhelyhez tartozik")
- [ ] Oldal-újratöltés után a hozzárendelések megmaradnak

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/kennels` oldalra.
2. Keresd meg a férőhely nélküli állatok szekcióját, és jegyezd fel az állatok számát.
3. Rendeld az első állatot az „A-1 kennel"-hez a legördülővel.
4. Ellenőrizd, hogy az állat megjelenik a kennel kártyáján, a foglaltság „1/2"-re nőtt, és a kihasználtsági sáv 50%-on áll.
5. Rendeld a második állatot is ugyanahhoz a kennelhez – ellenőrizd a „2/2" és „Megtelt" jelzést (piros), a sáv 100%-os és piros.
6. Az első állat sorában válaszd a másik férőhelyet (pl. „Karantén") – ellenőrizd, hogy az állat átkerül, és mindkét kártya foglaltsága frissül.
7. Válaszd a „— Kivesz —" opciót a második állatnál – ellenőrizd, hogy visszakerül a férőhely nélküli listába.
8. Töltsd újra az oldalt – ellenőrizd, hogy az aktuális hozzárendelések megmaradtak.

**Elvárt eredmény:**
Az állatok férőhelyhez rendelhetők, mozgathatók és kivehetők; a foglaltsági számlálók és a vizuális jelzések (zöld/piros, sáv) valós időben és újratöltés után is helyesek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-07: Kapacitás-korlát betartatása és férőhely törlése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; létezik egy 1 kapacitású férőhely, amelyben már van 1 állat, és legalább 1 további állat férőhely nélkül |
| **URL** | `/dashboard/kennels` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Megtelt férőhelyre nem helyezhető további állat: az API `409` státusszal válaszol, hibaüzenet: `A(z) „<név>" férőhely megtelt (1/1).`
- [ ] A hibaüzenet a felületen is megjelenik (piros figyelmeztető sáv), és az állat hozzárendelése nem változik
- [ ] A férőhely törlése (kuka ikon) megerősítő kérdést mutat: „Biztosan törlöd a férőhelyet? A benne lévő állatok férőhely nélkül maradnak."
- [ ] Megerősítés után a `DELETE /api/kennels/[id]` törli a férőhelyet, a kártya eltűnik
- [ ] A törölt férőhelyben lévő állatok automatikusan férőhely nélkülivé válnak (`kennelId: null`), és a férőhely nélküli szekcióban jelennek meg
- [ ] A törlés újratöltés után is érvényes (a rekord az adatbázisból törlődött)

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/kennels` oldalra.
2. Ellenőrizd, hogy az 1 kapacitású férőhely „Megtelt" jelzést mutat (1/1).
3. Próbálj egy férőhely nélküli állatot a megtelt férőhelyre rendelni a legördülővel.
4. Ellenőrizd, hogy piros hibaüzenet jelenik meg a megtelt férőhelyről, és az állat nem került be.
5. Kattints a megtelt férőhely kuka ikonjára – ellenőrizd a megerősítő kérdés szövegét.
6. Erősítsd meg a törlést.
7. Ellenőrizd, hogy a férőhely kártyája eltűnt, és a benne volt állat a férőhely nélküli szekcióba került.
8. Töltsd újra az oldalt – ellenőrizd, hogy a törlés és az állat állapota megmaradt.

**Elvárt eredmény:**
A kapacitás-túllépést a rendszer `409` hibával és érthető magyar üzenettel blokkolja. A férőhely törlése megerősítéshez kötött, a benne lévő állatok férőhely nélkül maradnak, de nem törlődnek.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-08: Áthelyezési kérelem indítása másik menhelyre

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | `shelter@test.hu` bejelentkezve; legalább 2 menhely létezik az adatbázisban; a menhelynek van legalább 1 állata |
| **URL** | `/dashboard/animals` → `/dashboard/transfers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/dashboard/animals` listában az állat soránál megjelenik az „Áthelyezés kérése" gomb (`TransferRequestButton`), ha létezik másik menhely
- [ ] A gombra kattintva modális ablak nyílik „Állat áthelyezése" címmel: Célmenhely (kötelező legördülő) és Megjegyzés (opcionális) mezőkkel
- [ ] Célmenhely kiválasztása nélkül a küldés blokkolt („Válassz célmenhelyet." hibaüzenet)
- [ ] A küldés (`POST /api/animals/[id]/transfer`) `PENDING` státuszú `AnimalTransfer` rekordot hoz létre a helyes `fromShelterId`, `toShelterId`, `requestedById`, `note` értékekkel
- [ ] Ugyanahhoz az állathoz nem indítható második kérelem, amíg az előző `PENDING`: `409` – „Már van folyamatban lévő áthelyezési kérelem ehhez az állathoz"
- [ ] A célmenhely adminjai `TRANSFER_REQUESTED` típusú értesítést („Áthelyezési kérelem érkezett") és e-mailt kapnak, `/dashboard/transfers` linkkel
- [ ] A kérelem a kérelmező oldalán a `/dashboard/transfers` „Várakozó kérelmek" szekciójában jelenik meg „Várakozó" (sárga) és „Kimenő" (narancs) badge-dzsel

**Tesztelési lépések:**
1. Jelentkezz be `shelter@test.hu` / `Admin1234!` fiókkal, és navigálj a `/dashboard/animals` oldalra.
2. Keresd meg az egyik állat soránál az „Áthelyezés kérése" gombot, és kattints rá.
3. Célmenhely választása nélkül kattints a küldés gombra – ellenőrizd a „Válassz célmenhelyet." hibaüzenetet.
4. Válassz célmenhelyet, írj megjegyzést (pl. „Túltelítettség miatt"), és küldd el a kérelmet.
5. Navigálj a `/dashboard/transfers` oldalra – ellenőrizd, hogy a kérelem a „Várakozó kérelmek" alatt látható „Várakozó" és „Kimenő" badge-dzsel, a forrás → cél menhely nevekkel.
6. Bontsd ki a kérelem kártyáját – ellenőrizd a kérelmező nevét és a megjegyzést.
7. Menj vissza a `/dashboard/animals` oldalra, és próbálj ugyanahhoz az állathoz újabb áthelyezést indítani – ellenőrizd a „Már van folyamatban lévő áthelyezési kérelem…" hibaüzenetet.
8. Jelentkezz be a célmenhely adminjával (vagy `admin@test.hu` főadminnal) – ellenőrizd a „Áthelyezési kérelem érkezett" értesítést a csengőnél.

**Elvárt eredmény:**
A kérelem `PENDING` státusszal létrejön, a fogadó menhely adminjai értesítést kapnak. Párhuzamos második kérelem ugyanarra az állatra nem indítható. A kérelmező oldalán a kérelem „Kimenő" jelöléssel követhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-16-09: Áthelyezés jóváhagyása / elutasítása a fogadó oldalon és státuszkövetés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Létezik `PENDING` áthelyezési kérelem (TC-16-08); a fogadó menhely adminja vagy `admin@test.hu` (SUPER_ADMIN) bejelentkezhet |
| **URL** | `/dashboard/transfers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A fogadó menhely adminja a kérelmet „Bejövő" (kék) badge-dzsel látja, kibontva jóváhagyó és elutasító gombokkal, opcionális megjegyzés mezővel
- [ ] Jóváhagyni/elutasítani csak a célmenhely adminja vagy SUPER_ADMIN tud (`PATCH /api/animals/[id]/transfer/[transferId]`, más: `403`); visszavonni (`CANCELLED`) csak a kérelmező / forrásmenhely adminja tud
- [ ] Jóváhagyáskor a kérelem `APPROVED` státuszú lesz, és az állat `shelterId`-ja tranzakcióban átíródik a célmenhelyre – az állat a célmenhely állatlistájában jelenik meg
- [ ] Elutasításkor a kérelem `REJECTED` státuszú lesz, az állat marad az eredeti menhelyen
- [ ] Lezárt kérelem újra nem bírálható el: ismételt hívásra `409` – „Ez a kérelem már lezárult"
- [ ] A kérelmező `TRANSFER_APPROVED` („Áthelyezés jóváhagyva") vagy `TRANSFER_REJECTED` („Áthelyezés elutasítva") értesítést és e-mailt kap
- [ ] A lezárt kérelem a „Lezárt kérelmek" szekcióba kerül a megfelelő badge-dzsel („Jóváhagyva" zöld / „Elutasítva" piros / „Visszavont" szürke), kibontva látszik a döntéshozó neve és a lezárás dátuma

**Tesztelési lépések:**
1. Jelentkezz be a fogadó menhely adminjával (vagy `admin@test.hu` / `Admin1234!` főadminnal), és navigálj a `/dashboard/transfers` oldalra.
2. Ellenőrizd, hogy a kérelem a „Várakozó kérelmek" alatt „Bejövő" badge-dzsel látható.
3. Bontsd ki a kártyát, írj megjegyzést (pl. „Van szabad kennelünk"), és kattints a jóváhagyás gombra.
4. Ellenőrizd, hogy a kérelem a „Lezárt kérelmek" szekcióba került „Jóváhagyva" (zöld) badge-dzsel, a döntéshozó nevével és dátummal.
5. Ellenőrizd a fogadó menhely `/dashboard/animals` listájában, hogy az állat átkerült (a forrásmenhely listájából eltűnt).
6. Ellenőrizd, hogy a kérelmező (`shelter@test.hu`) „Áthelyezés jóváhagyva" értesítést kapott.
7. (Elutasítási ág) Indíts új áthelyezési kérelmet egy másik állattal, majd a fogadó oldalon utasítsd el megjegyzéssel.
8. Ellenőrizd, hogy a kérelem „Elutasítva" (piros) státuszú, az állat az eredeti menhelyen maradt, és a kérelmező „Áthelyezés elutasítva" értesítést kapott.
9. (Negatív teszt) API-kliensből próbáld újra elbírálni a már lezárt kérelmet – ellenőrizd a `409`-es választ („Ez a kérelem már lezárult").

**Elvárt eredmény:**
A fogadó oldali döntés a `TransferStatus`-t helyesen állítja; jóváhagyásnál az állat ténylegesen átkerül a célmenhelyhez, elutasításnál marad. A kérelmező mindkét esetben értesül, a lezárt kérelmek nem módosíthatók újra.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
