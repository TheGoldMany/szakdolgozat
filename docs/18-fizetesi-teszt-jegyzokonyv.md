# 18 – Fizetési teszt jegyzőkönyv

## Összefoglalás

Ez a jegyzőkönyv a platform **teljes pénzügyi működését** fedi le: a három fizetési
útvonalat (egyszeri adomány, havi támogatói csomag, virtuális örökbefogadás), a
Stripe Connect fiókok bekötését, a visszatérítést és a visszaterhelést, valamint a
pénzügyi kimutatásokat.

A tesztek **Stripe sandbox** környezetben futtatandók, valódi pénz nélkül. Éles
váltás előtt a jegyzőkönyv minden pontja legyen zöld.

> **Miért ilyen részletes?** Destination charge modellt használunk: a terhelés a
> platform Stripe-fiókján jön létre, és onnan megy tovább a kedvezményezetthez.
> Ez azt jelenti, hogy egy hibás visszatérítés vagy egy elmaradt webhook nem
> „csak" adathiba, hanem **a platform egyenlegét érintő pénzügyi eltérés**.

---

## Szerepkörök

A tesztek négy szerepkört használnak. Érdemes négy külön böngészőprofilt vagy
inkognitó ablakot nyitni, hogy ne kelljen folyton ki-be jelentkezni.

| Jelölés | Szerepkör | Mire kell |
|---|---|---|
| 👤 **Látogató** | kijelentkezve | vendég adomány, nyilvános oldalak |
| 🧑 **USER** | sima felhasználó | adomány, előfizetés, virtuális örökbefogadás, saját gyűjtés |
| 🏠 **SHELTER_ADMIN** | menhely admin | menhely Stripe bekötése, csomagok, bevétel |
| 🛡️ **SUPER_ADMIN** | platform admin | jóváhagyás, visszatöltés, audit, vitatott tételek |

---

## Előfeltételek

**Mielőtt bármit tesztelsz, ezeknek meg kell lenniük:**

- [ ] Stripe **sandbox** környezet aktív (bal felső legördülő)
- [ ] `STRIPE_SECRET_KEY` = a sandbox `sk_test_...` kulcsa
- [ ] Webhook endpoint létrehozva a sandboxban: `https://<domain>/api/webhooks/stripe`
- [ ] A webhook endpointon **mind a 9 esemény** bekapcsolva (lásd `07-donations.md`)
- [ ] `STRIPE_WEBHOOK_SECRET` = az **ehhez az endpointhoz** tartozó `whsec_...`
- [ ] `NEXT_PUBLIC_APP_URL` és `NEXTAUTH_URL` **ugyanarra a hostra** mutat
- [ ] Legalább egy menhely létezik, aktív állapotban

### Teszt kártyák

| Kártyaszám | Mit vált ki | Hol használjuk |
|---|---|---|
| `4242 4242 4242 4242` | sikeres fizetés | a legtöbb teszt |
| `4000 0000 0000 9995` | elutasítás – fedezethiány | sikertelen fizetés |
| `4000 0000 0000 0341` | a kártya rögzül, de a terhelés bukik | előfizetés-megújítás bukása |
| `4000 0000 0000 0259` | sikeres, majd azonnal vitatott | chargeback teszt |

Lejárat: bármilyen jövőbeli dátum · CVC: bármi 3 számjegy.
A teljes lista a Stripe *Testing* dokumentációjában.

### Hasznos eszközök

- **Stripe → Developers → Webhooks → az endpoint → Events**: itt látod, mely
  események mentek ki és milyen válasszal (`200` = feldolgozva).
- **Stripe → Billing → Test clocks**: ezzel lehet előretekerni az időt, hogy a
  havi megújítás azonnal lefusson, ne kelljen egy hónapot várni.

---

## A – Előkészítés

### TC-18-01: Webhook-konfiguráció ellenőrzése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | Webhook endpoint létrehozva a sandboxban |
| **URL** | Stripe → Developers → Webhooks |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az endpoint URL-je a futó környezetre mutat
- [ ] Mind a 9 esemény szerepel a kiválasztottak között
- [ ] A *Signing secret* megegyezik a `STRIPE_WEBHOOK_SECRET` értékével

**Tesztelési lépések:**
1. Nyisd meg az endpointot a Stripe dashboardon.
2. Vesd össze az eseménylistát a `07-donations.md` táblázatával.
3. Kattints a *Send test webhook* gombra egy `checkout.session.completed` eseménnyel.
4. Nézd meg a válasz státuszát.

**Elvárt eredmény:**
A teszt esemény `200`-as választ kap. Ha `400`, az aláírókulcs nem egyezik; ha
`500`, alkalmazáshiba van a naplóban.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-02: Új menhely automatikusan megkapja a támogatási alapokat

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN |
| **Előfeltétel** | – |
| **URL** | `/dashboard/shelters` → új menhely |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A menhely létrehozása után **négy** csomag jön létre: 1 000 / 2 000 / 5 000 / 10 000 Ft
- [ ] Mindegyiknek van neve és leírása
- [ ] Létrejön egy „Általános támogatás" nevű, aktív gyűjtés
- [ ] Az állandó gyűjtésnek **nincs** határideje

**Tesztelési lépések:**
1. Hozz létre egy új menhelyet a dashboardon.
2. Válts át a menhelyre a menhely-váltóval, majd nyisd meg a `/dashboard/tiers` oldalt.
3. Nyisd meg a menhely nyilvános oldalát (`/hu/shelters/[slug]`).

**Elvárt eredmény:**
A csomagok listája a négy fix összeget mutatja. A menhely oldalán megjelenik a
„Támogasd a menhelyet" gomb és a havi csomagok blokk.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-03: Meglévő menhelyek visszatöltése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN |
| **Előfeltétel** | Legalább egy régi menhely, aminek nincsenek fix csomagjai |
| **URL** | `POST /api/admin/shelter-defaults` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A válasz megadja a létrehozott csomagok és gyűjtések számát
- [ ] A régi, nem szabványos összegű csomagok **inaktívra** állnak, de nem törlődnek
- [ ] Másodszor futtatva már nulla új elem jön létre (idempotens)

**Tesztelési lépések:**
1. Jelentkezz be super adminként, nyiss meg egy oldalt.
2. A böngésző konzoljába illeszd be:
   ```js
   fetch('/api/admin/shelter-defaults', { method: 'POST' })
     .then(r => r.json()).then(console.log)
   ```
3. Futtasd le **még egyszer**, és hasonlítsd össze a két választ.
4. Nézd meg a `/dashboard/tiers` oldalt: a régi összegű csomag „Régi összeg" jelölést kap.

**Elvárt eredmény:**
Az első futás pótolja a hiányzókat, a második `tiersCreated: 0` és
`campaignsCreated: 0` értéket ad.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## B – Stripe fiókok összekötése

### TC-18-04: Menhely Stripe fiókjának bekötése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🏠 SHELTER_ADMIN |
| **Előfeltétel** | A menhelynek nincs még Stripe fiókja |
| **URL** | `/dashboard/settings` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A gomb a Stripe onboarding oldalára visz
- [ ] Az űrlap kitöltése után visszatér a dashboardra
- [ ] A menhely állapota „aktív" lesz
- [ ] A Stripe → Connect → Connected accounts alatt megjelenik a fiók

**Tesztelési lépések:**
1. Nyisd meg a menhely beállításait, és indítsd el a Stripe bekötést.
2. A Stripe teszt-onboardingon használd a felkínált „gyorskitöltés" lehetőséget.
3. Térj vissza, és frissítsd az oldalt.
4. Ellenőrizd a Stripe dashboardon a Connected accounts listát.

**Elvárt eredmény:**
A fiók `details_submitted = true` állapotba kerül, és a menhely mostantól
fogadhat adományt.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-05: Felhasználó saját Stripe fiókjának bekötése

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Bejelentkezett felhasználó |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Stripe fiók csatlakoztatása" gomb elindítja az onboardingot
- [ ] Befejezés után a profil „A Stripe fiókod aktív" üzenetet mutat
- [ ] Ezután indítható saját gyűjtés a `/hu/campaigns/new` oldalon

**Tesztelési lépések:**
1. Nyisd meg a profilodat, és kösd be a Stripe fiókot.
2. Térj vissza, majd nyisd meg a `/hu/campaigns/new` oldalt.

**Elvárt eredmény:**
A gyűjtésindító űrlap elérhető, nem a „Előbb kösd be a Stripe fiókod" figyelmeztetés jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-06: Stripe nélküli kedvezményezettnél a fizetés elutasítva

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Olyan gyűjtés, aminek a kedvezményezettje nincs bekötve a Stripe-ba |
| **URL** | `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A fizetés nem indul el
- [ ] Érthető hibaüzenet jelenik meg, nem alkalmazáshiba
- [ ] **Nem** jön létre `Donation` sor az adatbázisban

**Tesztelési lépések:**
1. Keress vagy hozz létre egy gyűjtést Stripe nélküli menhelyhez.
2. Próbálj adományozni.

**Elvárt eredmény:**
402-es válasz, a felületen: „Ez a kampány jelenleg nem fogadhat adományokat…".
Ez a védelem akadályozza meg, hogy pénzt fogadjunk el olyan gyűjtésre, amit nem
tudunk kifizetni.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## C – Egyszeri adomány

### TC-18-07: Adomány bejelentkezett felhasználóként

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Aktív gyűjtés bekötött Stripe fiókkal (TC-18-04) |
| **URL** | `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A Checkouton **három tétel** látszik: az adomány, a platform díj (5%), a feldolgozási díj
- [ ] A végösszeg megegyezik a három tétel összegével
- [ ] Fizetés után a siker-oldalra irányít
- [ ] A gyűjtés összege pontosan az **adomány** összegével nő (nem a végösszeggel)
- [ ] A menhely admin app-értesítést és e-mailt kap
- [ ] Az adományozó köszönő e-mailt kap

**Tesztelési lépések:**
1. Adományozz 10 000 Ft-ot a `4242…` kártyával.
2. A Checkouton jegyezd fel a három tételt és a végösszeget.
3. Fizess, majd térj vissza a gyűjtés oldalára.
4. Jelentkezz be menhely adminként, és nézd meg az értesítéseket.
5. A Stripe dashboardon nyisd meg a fizetést.

**Elvárt eredmény:**
A támogató **10 665 Ft**-ot fizet, a gyűjtés összege **10 000 Ft**-tal nő.
A Stripe-on a *Payments* a teljes összeget, a *Connect → Transfers* a
kedvezményezettnek átment 10 000 Ft-ot mutatja.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-08: Adomány vendégként

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 👤 Látogató (kijelentkezve) |
| **Előfeltétel** | Aktív gyűjtés |
| **URL** | `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A fizetés bejelentkezés nélkül is végigvihető
- [ ] A gyűjtés összege nő
- [ ] Az adományozó neve helyett „Névtelen" jelenik meg
- [ ] Köszönő e-mail nem megy ki (nincs kihez)

**Tesztelési lépések:**
1. Jelentkezz ki, vagy nyiss inkognitó ablakot.
2. Adományozz 2 000 Ft-ot.

**Elvárt eredmény:**
A fizetés sikeres, az adomány „Névtelen" néven jelenik meg a listában.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-09: Névtelen adomány bejelentkezve

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | – |
| **URL** | `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A „Névtelen adományozás" jelölőnégyzet bejelölhető
- [ ] Az adományozók listájában nem jelenik meg a neved
- [ ] A menhely értesítésében is „Névtelen" szerepel

**Tesztelési lépések:**
1. Jelöld be a névtelen opciót, és adományozz.
2. Nézd meg a gyűjtés oldalán az adományozók listáját.

**Elvárt eredmény:**
Az összeg beleszámít, a név sehol nem jelenik meg.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-10: Minimum összeg kikényszerítése a szerveren

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Bejelentkezett felhasználó, aktív gyűjtés |
| **URL** | `POST /api/checkout/donate` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az űrlap nem enged 500 Ft alatti összeget
- [ ] Az API **közvetlen** hívása sem enged

**Tesztelési lépések:**
1. Próbálj az űrlapon 100 Ft-ot megadni.
2. A böngésző konzoljában kerüld meg az űrlapot:
   ```js
   fetch('/api/checkout/donate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ campaignId: '<ID>', amount: 1 })
   }).then(r => r.json()).then(console.log)
   ```

**Elvárt eredmény:**
Mindkét esetben elutasítás. A szerver 400-as választ ad – enélkül 1 Ft-os
adományokkal lehetne checkout-session-öket gyártani.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-11: Elhagyott fizetés takarítása

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | `checkout.session.expired` bekapcsolva |
| **URL** | `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A megkezdett, ki nem fizetett adomány sora eltűnik
- [ ] A gyűjtés összege nem változik

**Tesztelési lépések:**
1. Indíts egy adományt, de a Stripe Checkouton **ne fizess** – zárd be az ablakot.
2. A Stripe dashboardon keresd meg a lejárt sessiont, vagy várd meg a lejáratot
   (alapértelmezés szerint 24 óra).
3. Ellenőrizd, hogy megérkezett-e a `checkout.session.expired` esemény.

**Elvárt eredmény:**
Az esemény `200`-as választ kap, és a függőben lévő adomány-sor törlődik.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-12: Webhook újraküldése nem duplázza az összeget

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | Egy sikeres adomány (TC-18-07) |
| **URL** | Stripe → Webhooks → Events |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az újraküldés `200`-as választ kap
- [ ] A gyűjtés összege **nem** változik
- [ ] Nem érkezik második értesítés és e-mail

**Tesztelési lépések:**
1. Jegyezd fel a gyűjtés aktuális összegét.
2. Stripe → az adományhoz tartozó `checkout.session.completed` esemény → **Resend**.
3. Küldd újra még kétszer.
4. Frissítsd a gyűjtés oldalát, és nézd meg a menhely admin értesítéseit.

**Elvárt eredmény:**
Az összeg pontosan ugyanannyi marad. A Stripe *legalább egyszer* kézbesít, ezért
ez a védelem nélkülözhetetlen.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-13: Webhook kiesése esetén a siker-oldal pótol

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER + 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | – |
| **URL** | `/hu/donate/success` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Kikapcsolt webhook mellett is helyes a gyűjtés összege
- [ ] A webhook későbbi bekapcsolásakor **nem** számol újra

**Tesztelési lépések:**
1. A Stripe dashboardon **kapcsold ki** (disable) a webhook endpointot.
2. Adományozz 5 000 Ft-ot, és várd meg a siker-oldalt.
3. Ellenőrizd a gyűjtés összegét — nőnie kell.
4. Kapcsold vissza az endpointot, és küldd újra az eseményt.
5. Ellenőrizd újra az összeget.

**Elvárt eredmény:**
Az összeg a 3. lépésben nő, az 5. lépésben nem változik. Ez a két útvonal
(webhook és siker-oldal) közötti versenyhelyzet védelme.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## D – Állandó gyűjtés

### TC-18-14: „Támogasd a menhelyet" gomb

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 👤 Látogató |
| **Előfeltétel** | Menhely bekötött Stripe fiókkal |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A gomb akkor is látszik, ha a menhelynek **nincs** futó kampánya
- [ ] Az állandó gyűjtés oldalán **nincs** haladásjelző és célösszeg
- [ ] Helyette a folyamatos gyűjtésről szóló magyarázat jelenik meg
- [ ] Az adomány végigvihető

**Tesztelési lépések:**
1. Nyisd meg egy olyan menhely oldalát, aminek nincs saját kampánya.
2. Kattints a „Támogasd a menhelyet" gombra.
3. Adományozz 1 000 Ft-ot.

**Elvárt eredmény:**
A fizetés végigmegy. Enélkül egy kampány nélküli menhely egyáltalán nem tudna
egyszeri adományt fogadni.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-15: Az állandó gyűjtés nem szerkeszthető és nem törölhető

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🛡️ SUPER_ADMIN |
| **Előfeltétel** | – |
| **URL** | `/dashboard/campaigns` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Szerkesztési kísérlet 409-es hibát ad
- [ ] Törlési kísérlet 409-es hibát ad
- [ ] Az üzenet elmagyarázza, miért

**Tesztelési lépések:**
1. Keresd meg az „Általános támogatás" gyűjtést a listában.
2. Próbáld szerkeszteni, majd törölni.

**Elvárt eredmény:**
Mindkét művelet elutasítva, érthető magyarázattal.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-16: Az állandó gyűjtés nem jelenik meg a listákban

| | |
|---|---|
| **Prioritás** | 🟢 Alacsony |
| **Szerepkör** | 👤 Látogató |
| **Előfeltétel** | – |
| **URL** | `/hu/donate`, `/hu` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A `/hu/donate` gyűjtés-listában nem szerepel
- [ ] A főoldali „Aktív gyűjtések" sávban nem szerepel
- [ ] A cikkoldal oldalsávjában nem szerepel
- [ ] Közvetlen linkkel viszont elérhető

**Tesztelési lépések:**
1. Nézd végig a fenti listákat.
2. Nyisd meg közvetlenül az állandó gyűjtés URL-jét.

**Elvárt eredmény:**
A listákból hiányzik, de az oldala működik. Ez nem kampány egy történettel,
hanem a menhely mindig elérhető támogatás gombja.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## E – Havi támogatói csomag

### TC-18-17: Feliratkozás fix csomagra

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Menhely bekötött Stripe fiókkal |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A négy csomag megjelenik: 1 000 / 2 000 / 5 000 / 10 000 Ft
- [ ] A Checkouton három tétel látszik, mint az adománynál
- [ ] Fizetés után az előfizetés `ACTIVE` állapotú
- [ ] A felhasználó visszaigazoló e-mailt kap
- [ ] A menhely admin értesítést kap az új előfizetőről

**Tesztelési lépések:**
1. Válaszd az 5 000 Ft-os csomagot, és fizess a `4242…` kártyával.
2. Nézd meg a `/hu/finances` oldalt.
3. Menhely adminként nézd meg a `/dashboard/subscriptions` oldalt.

**Elvárt eredmény:**
Az előfizető havonta **5 345 Ft**-ot fizet, a menhely **5 000 Ft**-ot kap.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-18: Ugyanarra a csomagra nem lehet kétszer feliratkozni

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Aktív előfizetés (TC-18-17) |
| **URL** | `/hu/shelters/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A csomag „Előfizetve" állapotot mutat
- [ ] Újabb feliratkozási kísérlet elutasítva
- [ ] Nem jön létre második Stripe-előfizetés

**Tesztelési lépések:**
1. Próbálj újra feliratkozni ugyanarra a csomagra.
2. A Stripe → Subscriptions listában számold meg az előfizetéseket.

**Elvárt eredmény:**
Egyetlen aktív előfizetés van — a dupla terhelés kizárva.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-19: Havi megújítás lekönyvelése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe) + 🏠 SHELTER_ADMIN |
| **Előfeltétel** | Aktív előfizetés; `invoice.payment_succeeded` bekapcsolva |
| **URL** | Stripe → Billing → Test clocks |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A megújítás után új sor kerül a fizetéstörténetbe
- [ ] A `/dashboard/subscriptions` bevétele nő
- [ ] A `/hu/finances` „havi" bontása nő
- [ ] Az esemény újraküldése **nem** hoz létre második sort

**Tesztelési lépések:**
1. Hozz létre egy test clockot, és rendeld hozzá az előfizetést
   (vagy hozz létre újat a test clock alatt).
2. Tekerd előre az időt egy hónappal.
3. Ellenőrizd, hogy megérkezett-e az `invoice.payment_succeeded`.
4. Nézd meg a menhely bevételét a dashboardon.
5. Küldd újra az eseményt, és ellenőrizd, hogy nem duplázódik.

**Elvárt eredmény:**
Minden megújítás pontosan egyszer kerül könyvelésre. **Ez a legfontosabb
előfizetés-teszt**: enélkül a második hónaptól a pénz nyomtalanul érkezne.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-20: Sikertelen megújítás

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER + 🛡️ SUPER_ADMIN (Stripe) |
| **Előfeltétel** | `invoice.payment_failed` bekapcsolva |
| **URL** | Stripe → Test clocks |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az előfizetés `PAST_DUE` állapotba kerül
- [ ] A felhasználó app-értesítést kap
- [ ] A felhasználó e-mailt kap a sikertelen fizetésről

**Tesztelési lépések:**
1. Hozz létre előfizetést a `4000 0000 0000 0341` kártyával
   (a kártya rögzül, de a következő terhelés bukik).
2. Tekerd előre az időt a következő számlázásig.
3. Nézd meg a felhasználó értesítéseit és a profil oldalát.

**Elvárt eredmény:**
Az előfizetés „Késedelmes" állapotot mutat, és a felhasználó tudja, hogy a
kártyáját ellenőriznie kell.

> **Megjegyzés:** ez az ág korábban **soha nem futott le**, mert a kód olyan
> mezőből olvasta ki az előfizetést, ami ebben az API-verzióban már nem létezik.
> Ezért érdemes külön figyelmet fordítani rá.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-21: Sikeres újrapróbálkozás visszaállít aktívba

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe) |
| **Előfeltétel** | `PAST_DUE` előfizetés (TC-18-20) |
| **URL** | Stripe → Subscriptions |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Sikeres fizetés után az állapot újra `ACTIVE`
- [ ] A terhelés bekerül a fizetéstörténetbe

**Tesztelési lépések:**
1. A Stripe-on cseréld a kártyát működőre, és fizesd ki a nyitott számlát.
2. Ellenőrizd az előfizetés állapotát a platformon.

**Elvárt eredmény:**
Az előfizetés visszaáll aktívra, és a befizetés megjelenik a bevételben.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-22: Előfizetés lemondása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Aktív előfizetés |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A lemondás visszaigazolást kér
- [ ] A Stripe-on az előfizetés `cancel_at_period_end = true` lesz
- [ ] Az időszak végéig még aktív marad
- [ ] Az időszak lejártakor `CANCELLED` állapotba kerül

**Tesztelési lépések:**
1. Mondd le az előfizetést a profilodon.
2. Ellenőrizd a Stripe → Subscriptions állapotát.
3. Test clockkal tekerd túl az időszak végét.
4. Ellenőrizd az állapotot a platformon.

**Elvárt eredmény:**
A lemondás nem szakítja meg azonnal a már kifizetett időszakot, a végén viszont
lezárul, és a `customer.subscription.deleted` esemény frissíti az adatbázist.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-23: A csomag összege nem szerkeszthető

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🏠 SHELTER_ADMIN |
| **Előfeltétel** | – |
| **URL** | `/dashboard/tiers` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A szerkesztőben **nincs** összeg mező
- [ ] A név és a leírás szerkeszthető
- [ ] Nincs „új csomag" és „törlés" gomb
- [ ] API-ból küldött összeg-módosítás sem érvényesül

**Tesztelési lépések:**
1. Nyisd meg egy csomag szerkesztését, és írd át a nevét.
2. A konzolból próbáld meg az összeget módosítani:
   ```js
   fetch('/api/shelters/<SHELTER_ID>/tiers/<TIER_ID>', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ amount: 7000 })
   }).then(r => r.json()).then(console.log)
   ```

**Elvárt eredmény:**
A név mentődik, az összeg változatlan marad. A Stripe-előfizetés a belépéskori
árhoz van kötve, ezért egy átírt összeg a meglévő előfizetőket úgysem érné el.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## F – Virtuális örökbefogadás

### TC-18-24: Virtuális örökbefogadás indítása

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Elérhető állat bekötött Stripe fiókú menhelynél |
| **URL** | `/hu/animals/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Szabadon megadható havi összeg (500 – 1 000 000 Ft)
- [ ] 500 Ft alatti összeg elutasítva
- [ ] Választható a nyilvános/névtelen megjelenés
- [ ] Fizetés után az állat oldalán megjelenik a virtuális gazdi (ha nyilvános)
- [ ] Visszaigazoló e-mail érkezik

**Tesztelési lépések:**
1. Válassz egy állatot, és indíts virtuális örökbefogadást 3 000 Ft/hó összeggel.
2. Próbálj előbb 200 Ft-ot megadni.
3. Fizess, majd nézd meg az állat oldalát és a `/hu/finances` oldalt.

**Elvárt eredmény:**
A 200 Ft elutasítva, a 3 000 Ft végigmegy. A menhely havonta pontosan
3 000 Ft-ot kap.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-25: Ugyanarra az állatra nem lehet kétszer

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Aktív virtuális örökbefogadás |
| **URL** | `/hu/animals/[slug]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az újabb kísérlet elutasítva
- [ ] Egyetlen Stripe-előfizetés jön létre

**Tesztelési lépések:**
1. Próbálj újra virtuális gazdi lenni ugyanannál az állatnál.

**Elvárt eredmény:**
Elutasítás, dupla terhelés nélkül.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-26: Virtuális örökbefogadás lemondása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Aktív virtuális örökbefogadás |
| **URL** | `/hu/profile` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Lemondható a profilról
- [ ] A Stripe-on is lemondásra kerül
- [ ] Az állat oldaláról eltűnik a virtuális gazdi

**Tesztelési lépések:**
1. Mondd le a profilodon, majd nézd meg az állat oldalát.

**Elvárt eredmény:**
A lemondás mindkét oldalon érvényesül.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## G – Visszatérítés és visszaterhelés

### TC-18-27: Teljes visszatérítés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | Sikeres adomány; `charge.refunded` bekapcsolva |
| **URL** | Stripe → Payments → a fizetés → Refund |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A gyűjtés összege **csökken** a visszatérített összeggel
- [ ] Az adomány visszatérítettként jelölt
- [ ] A gyűjtés tulajdonosa értesítést kap
- [ ] A `/hu/finances` összesítőjéből kikerül

**Tesztelési lépések:**
1. Jegyezd fel a gyűjtés összegét.
2. A Stripe-on térítsd vissza a **teljes** adományt.
3. Frissítsd a gyűjtés oldalát.
4. Nézd meg a menhely admin értesítéseit.

**Elvárt eredmény:**
A gyűjtés összege pontosan az adomány összegével csökken. Enélkül a
visszatérített adomány örökre bennmaradna a haladásjelzőben.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-28: Részleges visszatérítés

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | Sikeres 10 000 Ft-os adomány |
| **URL** | Stripe → Payments → Refund |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Csak a visszatérített rész kerül levonásra
- [ ] Egy későbbi, teljes visszatérítés **csak a különbözetet** vonja le

**Tesztelési lépések:**
1. Téríts vissza **3 000 Ft**-ot a 10 000-ből. Ellenőrizd az összeget.
2. Ezután téríts vissza mindent. Ellenőrizd újra.

**Elvárt eredmény:**
Az első után 3 000-rel, a második után további 7 000-rel csökken — összesen
10 000-rel, nem 13 000-rel. A Stripe a **kumulált** visszatérített összeget
küldi, ezért ez a lépés kritikus.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-29: Visszatérítés-webhook újraküldése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | Feldolgozott visszatérítés |
| **URL** | Stripe → Webhooks → Events |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az összeg nem csökken tovább
- [ ] Nem megy ki második értesítés

**Tesztelési lépések:**
1. Küldd újra a `charge.refunded` eseményt háromszor.
2. Ellenőrizd a gyűjtés összegét.

**Elvárt eredmény:**
Az összeg változatlan. Védelem nélkül a gyűjtés mínuszba fordulhatna.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-30: Visszaterhelés (chargeback)

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER (fizetés) + 🛡️ SUPER_ADMIN (ellenőrzés) |
| **Előfeltétel** | `charge.dispute.created` bekapcsolva |
| **URL** | `/dashboard/audit` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] **Minden** super admin értesítést kap
- [ ] A vita megjelenik a `/dashboard/audit` oldal tetején
- [ ] Az összeg és az indok helyesen látszik
- [ ] Állapotváltáskor **nem** megy ki újabb értesítés

**Tesztelési lépések:**
1. Adományozz a `4000 0000 0000 0259` kártyával — a Stripe automatikusan
   vitatottá teszi.
2. Nézd meg a super admin értesítéseit.
3. Nyisd meg a `/dashboard/audit` oldalt.
4. A Stripe-on változtasd a vita állapotát, és ellenőrizd, hogy nem jön új értesítés.

**Elvárt eredmény:**
A vita rögzül és látható. Destination charge-nál a vitatott összeg **és** a
Stripe vitadíja is a platform egyenlegét terheli, ezért a gyors értesítés
pénzügyileg lényeges — a bizonyításnak határideje van.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## H – Pénzügyi kimutatások

### TC-18-31: Felhasználói pénzügyek

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🧑 USER |
| **Előfeltétel** | Legalább egy adomány és egy előfizetés |
| **URL** | `/hu/finances` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Az összesen érték tartalmazza az egyszeri és a havi befizetéseket is
- [ ] A bontás külön mutatja a kettőt
- [ ] A visszatérített összeg **nincs** benne

**Tesztelési lépések:**
1. Nyisd meg az oldalt, és vesd össze a számokat a ténylegesen befizetettekkel.
2. Egy visszatérítés után ellenőrizd újra.

**Elvárt eredmény:**
A számok megegyeznek a Stripe-on látottakkal, a visszatérítéssel csökkentve.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-32: Menhely bevételi kimutatása

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🏠 SHELTER_ADMIN |
| **Előfeltétel** | Legalább egy megújított előfizetés |
| **URL** | `/dashboard/subscriptions` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] „Havi bevétel" az aktuális hónap terheléseit mutatja
- [ ] „Összes visszatérő bevétel" az összeset
- [ ] A terhelések száma egyezik a Stripe-on láthatóval
- [ ] Az előfizetők számában csak az **élő** előfizetések szerepelnek

**Tesztelési lépések:**
1. Vesd össze a számokat a Stripe → Subscriptions és Payments listával.
2. Mondj le egy előfizetést, és nézd meg, hogy a számláló csökken-e.

**Elvárt eredmény:**
A kimutatás a ténylegesen befolyt pénzt mutatja, nem az elvi havidíjat.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## I – Jogosultságok

### TC-18-33: Felfüggesztett felhasználó nem fizethet

| | |
|---|---|
| **Prioritás** | 🟡 Közepes |
| **Szerepkör** | 🛡️ SUPER_ADMIN (felfüggesztés) + 🧑 USER (próba) |
| **Előfeltétel** | – |
| **URL** | `/dashboard/users` → `/hu/donate/[id]` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Felfüggesztés után az adomány 403-mal elutasítva
- [ ] Előfizetés és virtuális örökbefogadás is elutasítva
- [ ] Böngészni továbbra is tud
- [ ] Visszaaktiválás után újra tud fizetni

**Tesztelési lépések:**
1. Super adminként függeszd fel a teszt felhasználót.
2. A felhasználó fiókjával próbálj adományozni, előfizetni.
3. Aktiváld vissza, és próbáld újra.

**Elvárt eredmény:**
A felfüggesztés minden fizetési útvonalat blokkol, a böngészést nem.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

### TC-18-34: Admin végpontok védettsége

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🧑 USER és 🏠 SHELTER_ADMIN |
| **Előfeltétel** | – |
| **URL** | `POST /api/admin/shelter-defaults` |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] Sima felhasználóként 403
- [ ] Menhely adminként 403
- [ ] Kijelentkezve 401

**Tesztelési lépések:**
1. Mindhárom szerepkörben hívd meg a végpontot a konzolból:
   ```js
   fetch('/api/admin/shelter-defaults', { method: 'POST' })
     .then(r => console.log(r.status))
   ```
2. Ugyanezt a gyűjtés-törlő és a cikk-végpontokkal is.

**Elvárt eredmény:**
Csak super admin fér hozzá.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## J – Pénzügyi egyeztetés

### TC-18-35: A pénz szétosztásának ellenőrzése

| | |
|---|---|
| **Prioritás** | 🔴 Magas |
| **Szerepkör** | 🛡️ SUPER_ADMIN (Stripe dashboard) |
| **Előfeltétel** | Legalább egy sikeres, 10 000 Ft-os adomány |
| **URL** | Stripe → Payments / Balance / Connect → Transfers |
| **Tesztelő** | |
| **Dátum** | |
| **Státusz** | ⬜ Nem tesztelt |

**Elfogadási feltételek:**
- [ ] A támogató a három tétel összegét fizette
- [ ] A kedvezményezetthez pontosan az **adomány** összege ment át
- [ ] A platformhoz az `application_fee` érkezett
- [ ] A Stripe díja a platform egyenlegéről ment le
- [ ] A platform nettó eredménye **pozitív**

**Tesztelési lépések:**
1. Stripe → **Payments**: jegyezd fel a fizetett teljes összeget.
2. Stripe → **Connect → Transfers**: jegyezd fel a kedvezményezettnek átment összeget.
3. Stripe → **Balance**: jegyezd fel az `application_fee`-t és a levont Stripe-díjat.
4. Töltsd ki az alábbi táblázatot.

| Tétel | Elvárt (10 000 Ft-os adománynál) | Tényleges |
|---|---:|---:|
| Támogató fizetett | 10 665 Ft | |
| Kedvezményezett kapott | 10 000 Ft | |
| Platform jutalék (`application_fee`) | 665 Ft | |
| Stripe díja | *a fiókod díjszabása szerint* | |
| **Platform nettó** | *jutalék − Stripe díj* | |

**Elvárt eredmény:**
A kedvezményezett pontosan a szánt összeget kapja, és a platform nettó eredménye
pozitív.

> ⚠️ **Figyelem:** a kódban jelenleg **1,4% + 25 Ft** feldolgozási díj van
> feltételezve (`lib/stripe.ts`). Ha a Stripe ténylegesen többet von le, a
> különbözetet a platform nyeli el — a jutalékod a számítottnál kevesebb lesz.
> **Ezt a tesztet a valós díjszabásoddal kell elvégezni**, és eltérés esetén a
> konstansokat módosítani kell.

**Tényleges eredmény:**
> _Kitöltendő tesztelés után_

---

## Összesítő

| Csoport | Tesztek | Kész | Bukott |
|---|---:|---:|---:|
| A – Előkészítés | 3 | | |
| B – Stripe fiókok | 3 | | |
| C – Egyszeri adomány | 7 | | |
| D – Állandó gyűjtés | 3 | | |
| E – Havi csomag | 7 | | |
| F – Virtuális örökbefogadás | 3 | | |
| G – Visszatérítés és vita | 4 | | |
| H – Kimutatások | 2 | | |
| I – Jogosultságok | 2 | | |
| J – Pénzügyi egyeztetés | 1 | | |
| **Összesen** | **35** | | |

### Éles indulás feltétele

Az alábbi tesztek **bukása élesítést blokkoló**:

TC-18-01 · TC-18-06 · TC-18-07 · TC-18-12 · TC-18-13 · TC-18-19 ·
TC-18-20 · TC-18-27 · TC-18-28 · TC-18-29 · TC-18-30 · TC-18-34 · TC-18-35

Ezek mind olyan hibát fednének fel, ami **valódi pénzt érint**: elmaradt vagy
duplázott könyvelést, hibás visszatérítést, vagy jogosulatlan hozzáférést.
