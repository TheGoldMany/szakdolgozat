# ÁllatiMenhelyek.hu – Menhelyi Örökbefogadási Platform

Teljes körű webalkalmazás, amely összeköti az állami és civil menhelyeket az örökbefogadni kívánókkal. A platform lehetővé teszi az állatok böngészését, örökbefogadási kérelmek benyújtását, adományozást, önkéntességet, ideiglenes befogadást, elveszett/megtalált állatok bejelentését és az interaktív térkép-alapú keresést.

> **Tesztüzem**: Ez egy szakdolgozati projekt. Az adatok nem valósak, a funkciók kizárólag bemutatási célra készültek.

---

## Funkcionalitás

| Terület | Funkciók |
|---|---|
| **Állatok** | Böngészés, szűrés (faj, méret, kor, helyszín), kedvencek, részletes profil, egészségügyi napló |
| **Örökbefogadás** | Egyedi kérdőívek, kérelem-nyomkövetés, utánkövetési kérdőívek (30/90 nap) |
| **Menhelyek** | Profil (logó, borítókép, leírás), értékelési rendszer, csillagos minősítés |
| **Térkép** | Leaflet alapú, elveszett/megtalált/kóbor bejelentések, menhely-jelzők |
| **Adományozás** | Egyszeri kampány-adományok és havi előfizetési csomagok (Stripe Connect) |
| **Önkéntesség** | Jelentkezés, feladat-hozzárendelés, jelenléti napló |
| **Ideiglenes befogadás** | Foster profil, ellátmány-napló |
| **Események** | Nyílt napok, örökbefogadási napok, gyűjtések – regisztrációval |
| **Üzenetrendszer** | Felhasználó–menhely chat, olvasatlan jelzők, 30 s-os polling |
| **Értesítések** | Rendszer-értesítők (kérelem, időpont, önkéntes, készlet) |
| **Bejelentések** | Elveszett/megtalált/kóbor állatok – térkép + lista |
| **Készletkezelés** | Takarmány, gyógyszer, minimum-riasztás, mozgástörténet |
| **Kennelek** | Kennel-hozzárendelés, kapacitás-kihasználtság |
| **Áthelyezések** | Menhely-közi állat-transzfer dokumentálás |
| **Analytics** | UC-01–04 panelek (örökbefogadási trend, kapacitás, bejelentések, visszakerülési ráta) |
| **Lokalizáció** | 4 nyelv: Magyar / English / Deutsch / Polski |

---

## Tech Stack

| Réteg | Technológia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Nyelv | TypeScript 5.4 |
| Stílus | Tailwind CSS 3 |
| ORM | Prisma 5 |
| Adatbázis | PostgreSQL (fő DB + Data Warehouse) |
| Auth | NextAuth.js v4 (e-mail + Google OAuth) |
| Lokalizáció | next-intl 4 |
| Fizetések | Stripe (Payments, Subscriptions, Connect) |
| Térkép | Leaflet + React Leaflet |
| Diagramok | Recharts |
| Fájl feltöltés | Vercel Blob |
| E-mail | Nodemailer |
| PDF | @react-pdf/renderer |
| Validáció | Zod + React Hook Form |
| Unit tesztek | Vitest |
| E2E tesztek | Playwright |

---

## Projekt struktúra

```
.
├── app/
│   ├── [locale]/              # i18n route group (hu / en / de / pl)
│   │   ├── page.tsx           # Főoldal
│   │   ├── animals/           # Állat lista + részletes oldal
│   │   ├── shelters/          # Menhely lista + profil
│   │   ├── donate/            # Kampányok + adomány
│   │   ├── reports/           # Elveszett / megtalált bejelentések
│   │   ├── map/               # Interaktív térkép
│   │   ├── events/            # Események
│   │   ├── favorites/         # Kedvenc állatok
│   │   ├── appointments/      # Időpontok
│   │   ├── messages/          # Üzenetváltás
│   │   ├── notifications/     # Értesítések
│   │   ├── volunteers/        # Önkéntesség
│   │   ├── foster/            # Ideiglenes befogadás
│   │   ├── applications/      # Örökbefogadási kérelmek
│   │   ├── followups/         # Utánkövetések
│   │   ├── profile/           # Profil szerkesztés
│   │   ├── auth/              # Bejelentkezés / regisztráció
│   │   ├── sugo/              # Felhasználói útmutató
│   │   ├── kapcsolat/         # Kapcsolat
│   │   ├── adatvedelem/       # Adatvédelmi tájékoztató (GDPR)
│   │   └── aszf/              # Általános Szerződési Feltételek
│   ├── api/                   # REST API végpontok (109+)
│   │   ├── animals/           # Állat CRUD
│   │   ├── applications/      # Kérelmek
│   │   ├── admin/             # Admin végpontok
│   │   ├── checkout/          # Stripe checkout + webhook
│   │   ├── etl/               # Data Warehouse ETL (védett)
│   │   └── …
│   └── dashboard/             # Admin felület (Shelter Admin + Super Admin)
├── components/
│   ├── ui/                    # Alap UI elemek (Button, Badge, …)
│   ├── animals/               # Állat kártya, kedvenc gomb
│   ├── layout/                # Header, Footer
│   ├── dashboard/             # Admin panelek, analytics
│   ├── notifications/         # Értesítési csengő, lista
│   ├── donate/                # Kampány kártyák, tier kártyák
│   ├── reviews/               # Értékelések, csillag badge
│   ├── volunteers/            # Önkéntesség komponensek
│   ├── foster/                # Foster gombok
│   └── home/                  # Főoldal keresősáv
├── i18n/                      # next-intl routing konfiguráció
├── messages/                  # Fordítási fájlok
│   ├── hu.json
│   ├── en.json
│   ├── de.json
│   └── pl.json
├── lib/
│   ├── prisma.ts              # Prisma Client singleton
│   ├── auth.ts                # NextAuth konfiguráció
│   ├── stripe.ts              # Stripe Client singleton
│   └── utils.ts               # Segédfüggvények
├── prisma/
│   ├── schema.prisma          # Fő adatbázis (29 modell)
│   ├── dwh.prisma             # Data Warehouse séma
│   ├── seed.ts                # Alap seed adatok
│   └── seed-demo.ts           # Demo / bemutató seed
├── e2e/                       # Playwright E2E tesztek
├── tests/                     # Vitest unit tesztek
└── types/                     # Globális TypeScript típusok
```

---

## Gyors indítás

### 1. Klónozás és függőségek

```bash
git clone <repo-url>
cd szakdolgozat
npm install
```

### 2. Környezeti változók

```bash
cp .env.example .env
```

Töltsd ki a `.env` fájlt (részletes leírás lentebb).

### 3. Adatbázis

```bash
# Fő DB migrációk futtatása
npm run prisma:migrate

# Prisma Client generálása (mindkét schema)
npm run prisma:generate
npm run dwh:generate

# Alap seed adatok betöltése
npm run prisma:seed

# vagy demo adatokkal
npm run prisma:seed:demo
```

### 4. Fejlesztői szerver

```bash
npm run dev
# → http://localhost:3000
```

---

## Környezeti változók

### Kötelező

| Változó | Leírás |
|---|---|
| `DATABASE_URL` | PostgreSQL kapcsolati string (fő adatbázis) |
| `NEXTAUTH_SECRET` | Titkos kulcs – `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Fejlesztésnél: `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Publikus URL (CORS, callback URL-ek) |

### OAuth (opcionális)

| Változó | Leírás |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth – [console.cloud.google.com](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth titkos kulcs |

### Stripe (fizetési funkciókhoz)

| Változó | Leírás |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe titkos kulcs (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook aláírási titkos (`whsec_…`) |

Lokális webhook teszteléshez:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Fájl feltöltés

| Változó | Leírás |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (képek, dokumentumok) |

### E-mail

| Változó | Leírás |
|---|---|
| `RESEND_API_KEY` | Resend API kulcs (vagy konfigurálj SMTP-t a `lib/` mappában) |
| `EMAIL_FROM` | Feladó e-mail cím |

### Data Warehouse és ETL

| Változó | Leírás |
|---|---|
| `DWH_DATABASE_URL` | Különálló PostgreSQL kapcsolati string (analytics DB) |
| `ETL_SECRET` | ETL végpont védelmére – `openssl rand -hex 32` |
| `SEED_SECRET` | Seed API végpont védelmére |

---

## Adatbázis architektúra

### Fő adatbázis – `prisma/schema.prisma`

29 Prisma modell, főbb csoportok:

| Csoport | Modellek |
|---|---|
| Auth | `User`, `Account`, `Session`, `VerificationToken`, `PasswordResetToken` |
| Menhelyek | `Shelter`, `ShelterAdmin`, `ShelterDocument` |
| Állatok | `Animal`, `AnimalImage`, `AnimalDocument`, `BehaviorLog`, `HealthRecord`, `Kennel` |
| Örökbefogadás | `AdoptionApplication`, `AdoptionFollowUp`, `ApplicationForm`, `FormField`, `FormFieldResponse` |
| Kommunikáció | `Conversation`, `Message`, `Review`, `Notification` |
| Pénzügy | `DonationTier`, `Subscription`, `Campaign`, `Donation`, `Sponsorship` |
| Önkéntesség | `Volunteer`, `VolunteerTask`, `VolunteerTaskAssignment`, `VolunteerAttendance` |
| Ideiglenes befogadás | `FosterProfile`, `FosterSupplyLog` |
| Készlet | `InventoryItem`, `InventoryTransaction` |
| Egyéb | `Event`, `EventRegistration`, `AnimalTransfer`, `Appointment` |

### Data Warehouse – `prisma/dwh.prisma`

Különálló analitikai adatbázis az UC-01–04 dashboard panelek adataihoz.  
ETL frissítés: `POST /api/etl` (fejléc: `Authorization: Bearer <ETL_SECRET>`)

---

## Szerepkörök

| Szerepkör | Leírás |
|---|---|
| `USER` | Böngészés, kedvencek, kérelem, üzenet, önkéntes-/foster-jelentkezés |
| `SHELTER_ADMIN` | Saját menhely teljes kezelése (dashboard hozzáféréssel) |
| `SUPER_ADMIN` | Teljes platform-hozzáférés, menhelyek jóváhagyása, analytics |

---

## Lokalizáció

A platform 4 nyelven érhető el next-intl segítségével:

| Kód | Nyelv |
|---|---|
| `hu` | Magyar (alapértelmezett) |
| `en` | English |
| `de` | Deutsch |
| `pl` | Polski |

Az összes fordítási kulcs a `messages/` mappában található JSON fájlokban van.  
Új kulcs hozzáadásakor mind a 4 fájlt frissíteni kell.

---

## Szkriptek

```bash
# Fejlesztés
npm run dev              # Next.js dev szerver
npm run build            # Production build (Prisma + Next)
npm run start            # Production szerver
npm run lint             # ESLint

# Adatbázis
npm run prisma:migrate   # Migrációk futtatása
npm run prisma:generate  # Prisma Client generálása
npm run prisma:studio    # Prisma Studio (vizuális szerkesztő)
npm run prisma:seed      # Alap seed adatok
npm run prisma:seed:demo # Demo seed adatok
npm run db:reset         # Adatbázis reset + seed
npm run dwh:generate     # DWH Prisma Client
npm run dwh:push         # DWH séma push

# Tesztek
npm run test             # Vitest unit tesztek (egyszeri futás)
npm run test:watch       # Vitest watch mód
npm run test:coverage    # Vitest lefedettségi riport
npm run test:e2e         # Playwright – vendég flow
npm run test:e2e:admin   # Playwright – admin flow
npm run test:e2e:all     # Összes Playwright teszt
```

---

## Deployment

A projekt Vercel-re optimalizált.

1. Kösd össze a GitHub repót a Vercel projekttel
2. Add meg a fenti környezeti változókat a Vercel Dashboard-on
3. A `build` szkript automatikusan futtatja a Prisma generálást és migrációt

Stripe webhook URL a Vercel deployment után:  
`https://<your-domain>/api/webhooks/stripe`

---

## Licenc

Szakdolgozati projekt – © 2026
