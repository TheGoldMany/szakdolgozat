# 21 – Végigvezető bemutatók (onboarding tour)

## Összefoglalás

Ez a modul fedi le az oldalankénti **végigvezető bemutatókat**: az első
látogatáskor magától elinduló, lépésenként haladó buborékokat, amelyek kiemelik
a képernyő egy-egy részét, és elmondják róla azt, ami magából a felületből nem
derül ki. A bemutató **19 oldalon** érhető el (kezdőlap, állatlista, állat
adatlapja, menhelylista, menhely oldala, térkép, bejelentések, események,
támogatás, kérelmek, időpontok, üzenetek, profil, kedvencek, értesítések,
önkéntesség, ideiglenes befogadás, utánkövetés, ismerősök, napi állatok),
valamint a menhelyi **vezérlőpulton**. Bezárni bármikor lehet (X, Esc, vagy a
háttérre kattintva), újranézni pedig a fejléc **kérdőjel gombjával** vagy a
Súgó oldal bemutató-listájából.

---

## Hogyan épül fel

| Fájl | Szerepe |
|---|---|
| `components/onboarding/tour.tsx` | A motor: hogyan néz ki és hogyan viselkedik egy bemutató. Nem tud semmit arról, MIT mutat. |
| `lib/tours.ts` | A tartalom: melyik útvonalhoz milyen lépések tartoznak. |
| `components/onboarding/page-tour.tsx` | Összeköti a kettőt: az útvonalból kiválasztja a bemutatót. **Egy példány van belőle**, a `[locale]` elrendezésben. |
| `components/onboarding/tour-button.tsx` | A fejléc kérdőjel gombja — csak ott jelenik meg, ahol van bemutató. |
| `lib/tour-seen.ts` | „Láttam már" állapot a böngészőben. |
| `components/onboarding/dashboard-tour-launcher.tsx` | A vezérlőpult lépései, ugyanazzal a motorral. |

**Új bemutatóhoz nem kell az oldalhoz nyúlni.** Elég a `lib/tours.ts`-be egy
bejegyzés, és — ha kiemelni is akarunk valamit — a célelemre egy `data-tour`
attribútum. Mivel a `PageTour` az elrendezésben van, nem fordulhat elő, hogy
egy oldalról véletlenül kimarad a bemutató.

### Hol tároljuk, hogy látta-e

| Hol | Mivel | Miért ott |
|---|---|---|
| Nyilvános oldalak | `localStorage` | Ezeket többségében **bejelentkezés nélkül** nézik. Szerveroldali tárolással épp azok nem kapnának működő „már láttam" jelzést, akiknek a bemutató a leginkább szól. |
| Vezérlőpult | `User.dashboardTourSeen` (adatbázis) | Bejelentkezés mögött van, tehát mindig van hova írni; a menhely adminja pedig több gépről is dolgozik. |

A tárolt érték nem igen/nem, hanem a bemutató **verziószáma**. Ha egy bemutató
szövege elavul, a `version` emelésével a korábbi nézők is megkapják az újat —
anélkül, hogy bárki tárolt adatát törölni kellene.

### Mikor indul el magától

Az első látogatáskor, **600 ms késleltetéssel** (addigra az oldal elemei a
helyükön vannak). A „láttam" jelzés már a **megnyitáskor** elmegy, nem a
végigjátszáskor: aki félbehagyja és továbblép, azt ne zaklassa ugyanaz újra.
Ezért van mindig kéznél az újraindító gomb.

A Súgó oldal hivatkozásai `?bemutato=1` paramétert tesznek a címre; ez **akkor
is elindítja**, ha a felhasználó már látta.

---

## Amit a motor magától kezel

Ezek nem elméleti esetek — mindegyik mérésből derült ki, valódi böngészőben.

**Hiányzó célpont.** Ha egy lépés olyan elemre mutatna, ami nincs az oldalon
(szerepkörtől függő blokk, üres lista), a rendszer előbb **újrapróbálkozik**
(6 × 120 ms — az elemek gyakran később jelennek meg), utána a lépés **kimarad**.
Példa: az állat adatlapján az „Egészségügyi napló" lépés magától kimarad, ha az
adott állatnak még nincs bejegyzése.

**Rejtett elem.** A fejléc menüje telefonon `display: none`, tehát ott van a
HTML-ben, de **nulla méretű**. A rendszer ezt is „nincs mit mutatni"-ként kezeli.
Mérve: a kezdőlap bemutatója asztali gépen 6 lépés, telefonon 3 — pontosan a
menüpontokra mutató lépések maradnak ki. Ugyanez fordítva is igaz: a térkép
bemutatójában a mobil szűrőgombra mutató lépés asztali gépen marad ki.

**Felvillanó lépés.** Amíg a rendszer a célpontra vár, a buborék **nem jelenik
meg**. Enélkül a felhasználó fél másodpercre elolvashatott volna egy olyan
lépést, amit a rendszer épp kihagyni készül.

**Kattintás a háttérre.** A bemutató alatt a mögötte lévő oldal nem használható;
a háttérre kattintás bezárja a bemutatót.

**Billentyűzet.** `Esc` bezár, `→`/`←` lépked, a `Tab` az ablakon belül marad,
bezáráskor pedig a fókusz visszatér oda, ahonnan a bemutató indult.

**Mozgásérzékenység.** `prefers-reduced-motion` esetén nincs sima görgetés és
nincs átmenet.

**Kis kijelző.** 640 képpont alatt a buborék nem lebeg, hanem **alulra tapad** —
a 320 pontos kártya egy keskeny kijelzőn kiszorult volna a képernyőről.

---

## Felhasználói Történetek

- **US-21-A**: Mint első látogató, szeretném, hogy az oldal magától elmondja, mit hol találok, hogy ne kelljen kitalálnom.
- **US-21-B**: Mint visszatérő látogató, NEM szeretném újra és újra látni ugyanazt a bemutatót.
- **US-21-C**: Mint felhasználó, szeretném bármikor újranézni az aktuális oldal bemutatóját, ha elsőre átkattintottam rajta.
- **US-21-D**: Mint felhasználó, szeretném a Súgóból elérni az összes bemutatót, hogy célzottan megnézhessem, ami érdekel.
- **US-21-E**: Mint billentyűzettel dolgozó felhasználó, szeretném a bemutatót billentyűzetről kezelni, és nem elveszíteni a fókuszt.
- **US-21-F**: Mint menhelyi admin, szeretném a vezérlőpult bemutatóját bármelyik gépemen csak egyszer látni.

---

## Tesztesetek

---

### TC-21-01: A bemutató elindul az első látogatáskor

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Friss böngésző-profil vagy törölt böngészőtár (`localStorage`) |
| **URL** | `/hu` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az oldal betöltése után ~1 másodperccel megjelenik a bemutató első lépése
- [ ] A háttér elsötétül, és a kiemelt elem körül fényes „reflektor" látszik
- [ ] A „Tovább" gombbal végig lehet lépkedni, a „Vissza" gombbal visszafelé
- [ ] Az utolsó lépésen a gomb felirata „Kész"
- [ ] A lépésjelző (pontok vagy számláló) az aktuális lépést mutatja
- [ ] Bejelentkezés NEM szükséges hozzá

**Tesztelési lépések:**
1. Nyiss egy privát böngészőablakot (vagy töröld a böngészőtárat).
2. Navigálj a `/hu` címre.
3. Várd meg a bemutató megjelenését.
4. Lépkedj végig a „Tovább" gombbal, közben figyeld, hogy a kiemelés mindig a szövegben említett elemre mutat.
5. Az utolsó lépésen nyomd meg a „Kész" gombot.

**Elvárt eredmény:**
A bemutató magától elindul, a kiemelés végig a megfelelő elemen áll, és a „Kész" gombbal bezárul.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-21-02: Másodszor nem indul el magától

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | TC-21-01 lefutott ugyanabban a böngészőben |
| **URL** | `/hu/animals` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az állatlista bemutatója az első látogatáskor elindul
- [ ] Bezárás (X) után, az oldalt újratöltve **nem** indul el újra
- [ ] Akkor sem indul el, ha a felhasználó félbehagyta (nem játszotta végig)
- [ ] A böngészőtár törlése után újra elindul

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra, és várd meg a bemutatót.
2. Zárd be az X gombbal, már az első lépésnél.
3. Töltsd újra az oldalt, és várj 3 másodpercet.
4. Töröld a böngészőtárat (`localStorage`), és töltsd újra.

**Elvárt eredmény:**
A 3. lépésnél nem jelenik meg semmi; a 4. lépés után újra elindul.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-21-03: Újraindítás a fejléc gombjával

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | A bemutatót már látta a felhasználó ezen az oldalon |
| **URL** | `/hu/animals`, majd `/hu/adatvedelem` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A fejlécben megjelenik egy kérdőjel ikon
- [ ] Az ikon segédszövege az adott oldal bemutatójának nevét tartalmazza (pl. „Bemutató: Állatok böngészése")
- [ ] Rákattintva elindul a bemutató, akkor is, ha a felhasználó már látta
- [ ] Olyan oldalon, ahol **nincs** bemutató (pl. Adatvédelmi tájékoztató), a gomb **nem jelenik meg**
- [ ] A gomb telefonon is elérhető

**Tesztelési lépések:**
1. Navigálj a `/hu/animals` oldalra, zárd be a bemutatót.
2. Keresd meg a kérdőjel ikont a fejlécben, és vidd fölé az egeret (segédszöveg).
3. Kattints rá.
4. Navigálj a `/hu/adatvedelem` oldalra, és nézd meg, ott van-e az ikon.
5. Ismételd meg telefonos nézetben (keskeny ablak).

**Elvárt eredmény:**
A gomb ott van és indít, ahol van bemutató; az adatvédelmi oldalon nincs.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-21-04: Bemutatók listája a Súgóban

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | – |
| **URL** | `/hu/sugo#bemutatok` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A Súgó oldalon van egy „Végigvezető bemutatók" szakasz
- [ ] A szakasz felsorolja az állandó címmel rendelkező bemutatókat, lépésszámmal
- [ ] Egy elemre kattintva az adott oldal nyílik meg, és a bemutató **elindul**, akkor is, ha a felhasználó már látta
- [ ] A cím `?bemutato=1` paramétert tartalmaz
- [ ] A szakasz megemlíti, hogy az állat és a menhely adatlapjának is van bemutatója

**Tesztelési lépések:**
1. Navigálj a `/hu/sugo` oldalra, és görgess a „Végigvezető bemutatók" szakaszhoz.
2. Kattints a „Térkép" elemre.
3. Ellenőrizd a címsort és azt, hogy a bemutató elindul.
4. Menj vissza a Súgóba, és kattints egy olyan bemutatóra, amit már láttál.

**Elvárt eredmény:**
Mindkét esetben elindul a bemutató, a „már láttam" állapottól függetlenül.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-21-05: Billentyűzetes kezelés és fókusz

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | – |
| **URL** | `/hu/animals?bemutato=1` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A bemutató megnyílásakor a fókusz a buborékba kerül
- [ ] A `Tab` nem viszi ki a fókuszt a buborékból (körbejár)
- [ ] A `→` billentyű a következő, a `←` az előző lépésre lép
- [ ] Az `Esc` bezárja a bemutatót
- [ ] Bezárás után a fókusz visszatér oda, ahonnan a bemutató indult
- [ ] Képernyőolvasó bemondja, hányadik lépésnél tartunk

**Tesztelési lépések:**
1. Nyisd meg a `/hu/animals?bemutato=1` címet.
2. Nyomd a `Tab`-ot többször, és figyeld, hova kerül a fókusz.
3. Lépkedj a nyilakkal.
4. Nyomj `Esc`-et, és nézd meg, hol a fókusz.

**Elvárt eredmény:**
A fókusz végig a buborékban marad, a billentyűk működnek, és bezárás után a fókusz visszakerül.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-21-06: Hiányzó és rejtett elemek kihagyása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Előfeltétel** | Legyen egy állat, amelynek NINCS egészségügyi bejegyzése |
| **URL** | `/hu` (telefonos nézetben), `/hu/animals/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Telefonos nézetben a kezdőlap bemutatója **kevesebb** lépésből áll, mint asztali gépen (a fejléc menüpontjaira mutató lépések kimaradnak)
- [ ] A kimaradó lépés szövege **nem villan fel** — egyáltalán nem jelenik meg
- [ ] A reflektor sosem áll üres helyre vagy az előző lépés elemére
- [ ] Egészségügyi bejegyzés nélküli állatnál a „Egészségügyi napló" lépés kimarad
- [ ] A lépésjelző a ténylegesen megjelenő lépésekhez igazodik

**Tesztelési lépések:**
1. Nyisd meg a kezdőlapot asztali szélességben, és számold meg a lépéseket.
2. Szűkítsd az ablakot telefonméretre (390 px), töröld a böngészőtárat, tölts újra, és számold meg újra.
3. Nyiss meg egy egészségügyi bejegyzés nélküli állatot, és játszd végig a bemutatót.

**Elvárt eredmény:**
Telefonon rövidebb a bemutató, sehol nincs üres kiemelés, és nem villan fel kihagyott lépés.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-21-07: A vezérlőpult bemutatója fiókhoz kötött

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Előfeltétel** | `shelter@test.hu` fiók, amely **még nem** látta a vezérlőpult bemutatóját |
| **URL** | `/dashboard` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Első bejelentkezéskor a vezérlőpulton elindul a bemutató
- [ ] A `User.dashboardTourSeen` mező `true` értékre vált
- [ ] **Másik böngészőben** ugyanazzal a fiókkal belépve már nem indul el (szemben a nyilvános oldalakkal, ahol böngészőnként külön)
- [ ] Az oldalsáv alján lévő „Bemutató" gombbal újraindítható
- [ ] Olyan menüpont, amit a szerepkör nem lát, magától kimarad a bemutatóból

**Tesztelési lépések:**
1. Állítsd a teszt-fiók `dashboardTourSeen` mezőjét `false`-ra (Prisma Studio).
2. Jelentkezz be `shelter@test.hu` fiókkal, és nyisd meg a `/dashboard` oldalt.
3. Ellenőrizd az adatbázisban a mező értékét.
4. Jelentkezz be ugyanazzal a fiókkal egy másik böngészőben.
5. Indítsd újra az oldalsáv „Bemutató" gombjával.

**Elvárt eredmény:**
Elsőre elindul, a mező `true` lesz, másik böngészőben már nem indul el, a gombbal viszont újranézhető.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_
