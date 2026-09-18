# ÁllatiMenhelyek.hu – Tesztdokumentáció és Onboarding

> Ez a mappa tartalmazza a platform összes fő funkciójának **User Story-alapú tesztdokumentációját**.  
> Célja: csapat onboarding, QA tesztelés, és thesis-bemutató dokumentáció.

---

## Tartalomjegyzék

| Fájl | Terület | Tesztesetek |
|---|---|---|
| [01-auth.md](./01-auth.md) | Regisztráció (user + menhely önregisztráció), bejelentkezés, OAuth, felfüggesztett fiók | TC-01-01 – TC-01-08 |
| [02-animals.md](./02-animals.md) | Állat böngészés, szűrés, kedvencek, hivatalos papírok | TC-02-01 – TC-02-09 |
| [03-adoption.md](./03-adoption.md) | Örökbefogadási kérelem teljes folyamat | TC-03-01 – TC-03-08 |
| [04-shelters-reviews.md](./04-shelters-reviews.md) | Menhely profil, önregisztráció, geokódolás, értékelések | TC-04-01 – TC-04-08 |
| [05-appointments.md](./05-appointments.md) | Időpontfoglalás (user + admin) | TC-05-01 – TC-05-06 |
| [06-messages.md](./06-messages.md) | Üzenetváltás | TC-06-01 – TC-06-05 |
| [07-donations.md](./07-donations.md) | Kampányok (Stripe-feltétel, opcionális menhely/állat), előfizetések | TC-07-01 – TC-07-10 |
| [08-volunteers-foster.md](./08-volunteers-foster.md) | Önkéntesség, ideiglenes befogadás | TC-08-01 – TC-08-08 |
| [09-reports-map.md](./09-reports-map.md) | Bejelentések, interaktív térkép, menhely-jelzők | TC-09-01 – TC-09-07 |
| [10-notifications.md](./10-notifications.md) | Értesítési rendszer | TC-10-01 – TC-10-05 |
| [11-dashboard.md](./11-dashboard.md) | Admin dashboard: állatok, papírok, kérelmek, készlet, bemutató | TC-11-01 – TC-11-16 |
| [12-superadmin.md](./12-superadmin.md) | Super Admin: felhasználók (felfüggesztés/törlés), menhelyek | TC-12-01 – TC-12-12 |
| [13-profile.md](./13-profile.md) | Profil, avatar, jelszó, Stripe fiók, nyelvváltás | TC-13-01 – TC-13-08 |
| [14-followups.md](./14-followups.md) | Örökbefogadás utáni utánkövetés | TC-14-01 – TC-14-06 |
| [15-events.md](./15-events.md) | Események (publikus + admin) | TC-15-01 – TC-15-07 |
| [16-forms-kennels-transfers.md](./16-forms-kennels-transfers.md) | Kérvénysablonok, kennelek, áthelyezések | TC-16-01 – TC-16-09 |
| [17-settings-tiers.md](./17-settings-tiers.md) | Menhely beállítások, Stripe Connect, térképes helyszín, támogatói szintek | TC-17-01 – TC-17-08 |
| [18-fizetesi-teszt-jegyzokonyv.md](./18-fizetesi-teszt-jegyzokonyv.md) | **Fizetési teszt jegyzőkönyv**: a három fizetési útvonal, visszatérítés, chargeback, pénzügyi egyeztetés | TC-18-01 – TC-18-35 |
| [21-bemutatok.md](./21-bemutatok.md) | Végigvezető bemutatók (onboarding tour) minden fontosabb oldalon | TC-21-01 – TC-21-07 |
| [22-kozosseg-tartalom-adatok.md](./22-kozosseg-tartalom-adatok.md) | Napi állatok, ismerősök, cikkek, állatorvosi rendelők, audit napló | TC-22-01 – TC-22-06 |

**Összesen: 190 teszteset** (a fenti fájlokban lévő `TC-` azonosítók száma).

### Teszteseteket nem tartalmazó dokumentumok

| Fájl | Mire való |
|---|---|
| [19-ai-asszisztens-prompt.md](./19-ai-asszisztens-prompt.md) | Betanító szöveg AI-asszisztenshez: a projekt íratlan szabályai és a már egyszer megfizetett csapdák |
| [20-mobil-kiadas.md](./20-mobil-kiadas.md) | A mobilalkalmazás store-kiadása: adatkezelési lista a kérdőívekhez, és a még hiányzó lépések |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Rendszer-architektúra áttekintés új fejlesztőknek |

### Hol tart a mobilalkalmazás

A `mobile/` mappában Expo (React Native) kliens van, amely **ugyanazt a webes
API-t** hívja. A funkciói a saját moduljuk dokumentumában szerepelnek — keresd a
„Mobilalkalmazás" szakaszt a
[08](./08-volunteers-foster.md), [10](./10-notifications.md),
[11](./11-dashboard.md), [13](./13-profile.md) és [15](./15-events.md)
fájlokban. A mobilra vonatkozó íratlan szabályok a `mobile/AGENTS.md`-ben vannak.

---

## Státusz jelölések

| Jelölés | Jelentés |
|---|---|
| ⬜ | Nem tesztelt |
| ✅ | Sikeres (PASS) |
| ❌ | Sikertelen (FAIL) |
| ⚠️ | Részleges / feltételes |

## Prioritás jelölések

| Jelölés | Szint |
|---|---|
| 🔴 | Magas – kritikus funkció |
| 🟡 | Közepes – fontos, de nem blokkoló |
| 🟢 | Alacsony – kényelmi funkció |

---

## Fejlesztői Onboarding

### 1. Klónozás és setup

```bash
git clone <repo-url> && cd szakdolgozat
npm install
cp .env.example .env          # töltsd ki az env változókat
npx prisma db push            # a séma szinkronizálása (a projekt NEM migrációkkal megy)
npm run prisma:seed:demo      # demo adatokkal (ajánlott)
npm run dev
```

> **A séma `prisma db push` alapú, nincs `migrations/` mappa.** Séma-változás
> után `prisma generate` kell **mindkét** sémára (`schema.prisma` és
> `prisma/dwh.prisma`) — a `npm run build` ezt magától megteszi.

### 1/b. A mobilalkalmazás elindítása

```bash
cd mobile
npm install                   # sima install, NEM --legacy-peer-deps
npx expo start
```

### 2. Tesztkörnyezet alapadatok (`prisma:seed:demo` után)

| Szerepkör | E-mail | Jelszó |
|---|---|---|
| Super Admin | `admin@test.hu` | `Admin1234!` |
| Shelter Admin | `shelter@test.hu` | `Admin1234!` |
| Felhasználó | `user@test.hu` | `User1234!` |

> **Stripe tesztelés**: Teszt kártyaszám: `4242 4242 4242 4242`, bármilyen jövőbeli dátum, bármilyen CVC.

### 3. Fontos URL-ek fejlesztésben

| Oldal | URL |
|---|---|
| Főoldal | `http://localhost:3000` |
| Admin dashboard | `http://localhost:3000/dashboard` |
| Prisma Studio | Futtatás: `npm run prisma:studio` → `http://localhost:5555` |
| API | `http://localhost:3000/api/...` |

### 4. Lokális Stripe webhook

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# A kapott whsec_... értéket add meg a STRIPE_WEBHOOK_SECRET env változóba
```

---

## Tesztelési konvenciók

- Minden tesztesethez töltsd ki az **Tényleges eredmény** és **Státusz** mezőket.
- Ha hibát találsz, nyiss egy GitHub Issue-t `bug` és az érintett feature label-lel.
- Az e2e tesztek a `e2e/` mappában találhatók, futtatás: `npm run test:e2e`.
- A unit tesztek a `tests/` mappában, futtatás: `npm run test` (jelenleg 12 fájl, 162 eset).
- Típusellenőrzés: `npx tsc --noEmit` — a webes gyökérben és a `mobile/` mappában külön-külön.
- Éles buildhez hasonló ellenőrzés adatbázis nélkül: `SKIP_ENV_VALIDATION=1 npx next build`.
