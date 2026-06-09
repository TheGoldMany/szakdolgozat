# Rendszer-architektúra áttekintés

> Fejlesztői onboarding-dokumentum az **ÁllatiMenhelyek.hu** állatmenhely-örökbefogadási
> platformhoz. Célja, hogy egy új fejlesztő gyorsan átlássa a kódbázis felépítését,
> a fő modulokat és a köztük lévő kapcsolatokat. A funkcionális tesztesetek a
> [docs/README.md](./README.md) alatti `01-17` dokumentumokban találhatók.

---

## 1. Áttekintés

A platform egy többszereplős állatmenhely-örökbefogadási rendszer:

- **Látogatók / örökbefogadók** böngészhetnek az állatok között, kérelmet adhatnak be,
  időpontot foglalhatnak, üzenhetnek a menhelynek, adományozhatnak, önkéntesnek vagy
  ideiglenes befogadónak jelentkezhetnek, elveszett/talált állatot jelenthetnek be.
- **Menhelyi adminok** (`SHELTER_ADMIN`) a `/dashboard` felületen kezelik az állatokat,
  kérelmeket, kenneleket, készletet, önkénteseket, eseményeket és a pénzügyeket.
- **Super admin** (`SUPER_ADMIN`) a teljes platformot felügyeli: menhelyek, felhasználók,
  kampány- és űrlap-jóváhagyások, ETL futtatás.

### Fő technológiák

| Réteg | Technológia | Hol |
|---|---|---|
| Keretrendszer | **Next.js 14 (App Router)** + React 18 + TypeScript | `app/`, `next.config.js` |
| Adatbázis | **PostgreSQL** + **Prisma 5** (két séma: OLTP + DWH) | `prisma/schema.prisma`, `prisma/dwh.prisma` |
| Autentikáció | **NextAuth 4** (JWT session, Credentials + Google + Facebook) | `lib/auth.ts`, `app/api/auth/[...nextauth]/` |
| Lokalizáció | **next-intl 4** (hu / en / de / pl) | `i18n/`, `messages/` |
| Fizetés | **Stripe** (Checkout, Subscriptions, Connect, webhook) | `lib/stripe.ts`, `app/api/checkout/`, `app/api/webhooks/stripe/` |
| Fájltárolás | **Vercel Blob** (kliensoldali feltöltés) | `app/api/upload/*` |
| UI | **Tailwind CSS 3**, lucide-react ikonok, Recharts, react-leaflet térkép | `components/`, `tailwind.config.js` |
| Űrlapok / validáció | react-hook-form + **Zod** (API oldalon is) | `lib/validations/`, API route-ok |
| E-mail | nodemailer (SMTP) | `lib/email.ts` |
| PDF | @react-pdf/renderer (örökbefogadási szerződés) | `lib/pdf/adoption-contract.tsx` |
| Tesztelés | **Vitest** (unit) + **Playwright** (e2e) | `tests/`, `e2e/`, `vitest.config.ts`, `playwright.config.ts` |

---

## 2. Könyvtárstruktúra

```text
szakdolgozat/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Gyökér layout – csak átengedi a children-t
│   ├── [locale]/              # PUBLIKUS oldalak (next-intl, hu/en/de/pl)
│   │   ├── page.tsx           # Főoldal
│   │   ├── animals/[slug]/    # Állatlista + állat adatlap
│   │   ├── shelters/[slug]/   # Menhelylista + menhelyprofil
│   │   ├── applications/      # Saját örökbefogadási kérelmek
│   │   ├── apply/[token]/     # Meghívó-tokenes kérelem-kitöltés
│   │   ├── appointments/      # Időpontfoglalások
│   │   ├── messages/[id]/     # Beszélgetések (chat)
│   │   ├── campaigns/, donate/ # Adománykampányok, fizetés
│   │   ├── events/[slug]/     # Örökbefogadási napok / események
│   │   ├── favorites/         # Kedvencek
│   │   ├── followups/         # Örökbefogadás utáni utánkövetés
│   │   ├── foster/, volunteers/ # Ideiglenes befogadó / önkéntes jelentkezés
│   │   ├── reports/, map/     # Elveszett/talált bejelentések + térkép
│   │   ├── auth/              # login, register, forgot/reset-password, verify-email
│   │   ├── profile/, notifications/, users/[id]/
│   │   └── adatvedelem/, aszf/, sugo/, kapcsolat/  # statikus oldalak
│   ├── dashboard/             # ADMIN felület (NEM lokalizált, mindig magyar)
│   │   ├── layout.tsx         # Szerveroldali role-ellenőrzés + sidebar
│   │   ├── animals/, applications/, appointments/, followups/
│   │   ├── kennels/, inventory/, foster/, volunteers/, events/
│   │   ├── forms/             # Kérelem-űrlap builder (FormField)
│   │   ├── campaigns/, tiers/, subscriptions/   # pénzügyek
│   │   ├── transfers/         # menhelyek közötti állat-áthelyezés
│   │   ├── shelters/, users/  # SUPER_ADMIN-funkciók
│   │   └── settings/          # menhelybeállítások, Stripe Connect onboarding
│   └── api/                   # REST-szerű API route-ok (lásd 6. fejezet)
├── components/                # React komponensek funkcionális mappákban
│   ├── ui/                    # Általános építőelemek (button, card, input,
│   │                          #   image-upload, leaflet-map, skeletons …)
│   ├── layout/                # header.tsx, footer.tsx
│   ├── dashboard/             # admin-specifikus komponensek (form-builder,
│   │                          #   analytics-section, application-review …)
│   ├── animals/, shelters/, applications/, chat/, donate/, events/,
│   │   foster/, inventory/, kennel/, notifications/, reports/, reviews/ …
│   └── providers.tsx          # SessionProvider stb. kliens-wrapper
├── lib/                       # Szerveroldali segédkönyvtárak
│   ├── prisma.ts              # OLTP PrismaClient singleton
│   ├── dwh.ts                 # DWH PrismaClient singleton (generált kliens)
│   ├── auth.ts                # NextAuth authOptions
│   ├── mobile-auth.ts         # Bearer-tokenes auth a mobil API-hoz (jose)
│   ├── stripe.ts              # Stripe singleton + platformdíj-logika
│   ├── email.ts               # nodemailer sablonos levelek
│   ├── notifications.ts       # In-app értesítés létrehozó helperek
│   ├── etl-helpers.ts         # ETL tiszta függvények (unit-tesztelve)
│   ├── rate-limit.ts          # Egyszerű in-memory rate limiter
│   ├── validations/           # Zod sémák (auth.ts)
│   ├── pdf/                   # adoption-contract.tsx (PDF szerződés)
│   └── generated/dwh-client/  # A dwh.prisma-ból generált Prisma kliens
├── i18n/                      # next-intl konfiguráció (routing, request, navigation)
├── messages/                  # hu.json, en.json, de.json, pl.json
├── prisma/
│   ├── schema.prisma          # OLTP séma (42 modell)
│   ├── dwh.prisma             # Data Warehouse csillagséma (8 modell)
│   ├── seed.ts                # Alap seed (npm run prisma:seed)
│   └── seed-demo.ts           # Demó adatok (npm run prisma:seed:demo)
├── middleware.ts              # next-intl + NextAuth middleware
├── tests/                     # Vitest unit tesztek
├── e2e/                       # Playwright end-to-end tesztek
├── docs/                      # Teszteset-dokumentáció (01-17) + ez a fájl
├── mobile/                    # Külön React Native (Expo) mobilkliens
└── types/next-auth.d.ts       # Session/JWT típusbővítés (id, role)
```

---

## 3. Routing architektúra

### 3.1 Két route-fa: `[locale]` és `/dashboard`

- **`app/[locale]/`** – minden publikus / felhasználói oldal. A `[locale]` szegmenst a
  next-intl middleware tölti ki. A `localePrefix: "as-needed"` beállítás miatt
  (`i18n/routing.ts`) a magyar (default) URL-ek prefix nélküliek (`/animals`), míg a
  többi nyelv prefixet kap (`/en/animals`, `/de/animals`, `/pl/animals`).
- **`app/dashboard/`** – az admin felület **kívül esik** a `[locale]` csoporton, nem
  lokalizált: a `app/dashboard/layout.tsx` fixen `locale="hu"`-val és a
  `messages/hu.json`-nal hozza létre a `NextIntlClientProvider`-t.
- **`app/layout.tsx`** (gyökér) szándékosan üres – csak `return children`, mert a
  `<html>`/`<body>` tageket a `[locale]/layout.tsx` és a `dashboard/layout.tsx` adja.

### 3.2 `middleware.ts` működése

A `middleware.ts` egyetlen belépési pontban kombinálja a next-intl és a NextAuth
middleware-t:

1. A `config.matcher` kizárja az `api`, `_next`, `_vercel` útvonalakat és a statikus
   fájlokat — **az API route-okra tehát NEM fut middleware**, ott minden handler maga
   ellenőrzi a session-t.
2. Védett prefixek: `/dashboard`, `/profile`, `/applications`, `/messages`.
   - Ha az útvonal védett → `withAuth` fut: token nélkül átirányít a
     `/auth/login` oldalra (`pages.signIn`).
   - `/dashboard` alatt **role-ellenőrzés** is történik: csak `SHELTER_ADMIN` vagy
     `SUPER_ADMIN` mehet tovább, mindenki más a főoldalra (`/`) kerül.
   - A nem-dashboard védett útvonalakon a sikeres auth után az intl middleware is
     lefut (a locale-routing miatt).
3. Minden más útvonalon csak az `intlMiddleware` fut (locale-felismerés kikapcsolva:
   `localeDetection: false`).

Fontos: a middleware csak az első védvonal — a `app/dashboard/layout.tsx`
szerveroldalon **újra ellenőrzi** a session-t és a szerepkört (defense in depth).

---

## 4. Adatmodell (`prisma/schema.prisma`)

Az OLTP séma **42 modellt** tartalmaz, PostgreSQL-en. Logikai csoportosítás:

### 4.1 Felhasználók és autentikáció
- **`User`** – központi modell, ~25 relációval. Mezők: `role` (`Role` enum),
  `stripeAccountId` + `stripeOnboardingComplete` (egyéni kampányindítóknak is lehet
  Connect-fiókja), cím-adatok.
- **`Account`, `Session`, `VerificationToken`** – szabványos NextAuth (Prisma adapter) táblák.
- **`PasswordResetToken`** – jelszó-visszaállító tokenek.

### 4.2 Menhelyek és üzemeltetés
- **`Shelter`** – menhely: slug, cím + `lat`/`lng` (térkép), `isVerified`, `capacity`,
  cég- és bankadatok, `stripeAccountId`.
- **`ShelterAdmin`** – kapcsolótábla `User` ↔ `Shelter` között (`@@unique([userId, shelterId])`).
  Egy `SHELTER_ADMIN` szerepkörű user ezen keresztül van menhelyhez rendelve.
- **`ShelterDocument`** – menhelyi dokumentumok (pl. működési engedély).
- **`Kennel`** – fizikai férőhely (`KennelType`: `KENNEL`, `CAT_ROOM`, `QUARANTINE`,
  `AVIARY`, `OUTDOOR`, `OTHER`), kapacitással.
- **`InventoryItem` + `InventoryTransaction`** – készletkezelés
  (`InventoryCategory`: `FOOD`, `MEDICINE`, `SUPPLIES`, `CLEANING`, `EQUIPMENT`, `OTHER`;
  `InventoryTxType`: `IN`, `OUT`, `ADJUST`).
- **`AnimalTransfer`** – menhelyek közötti áthelyezési kérelem
  (`fromShelter` / `toShelter` relációk, `TransferStatus`).

### 4.3 Állatok
- **`Animal`** – a központi entitás: `type` (`AnimalType`), `size`, `status`
  (`AnimalStatus`), belső `flags` (`AnimalFlag[]` — pl. `ESCAPE_ARTIST`,
  `FOOD_AGGRESSIVE`, csak adminoknak látható), `progressLevel` (rehabilitációs szint
  0–100), opcionális `kennelId` és `fosterId` (hol van fizikailag az állat).
- **`AnimalImage`, `AnimalDocument`** – képek (`isPrimary`, `order`) és dokumentumok.
- **`HealthRecord`** – egészségügyi napló (`HealthRecordType`: `VACCINATION`,
  `TREATMENT`, `VET_VISIT`, `SURGERY`, `DEWORMING`, `CHECKUP`), `nextDueDate`-tel.
- **`BehaviorLog`** – viselkedési/rehabilitációs bejegyzések fejlődési pillanatképpel.

### 4.4 Örökbefogadási folyamat
- **`AdoptionApplication`** – kérelem; `@@unique([userId, animalId])` (egy user egy
  állatra egyszer jelentkezhet), opcionális `inviteToken` (chatből küldött meghívó),
  `formId` (egyedi űrlap).
- **`ApplicationForm` → `FormField` → `FormFieldResponse`** – menhelyenkénti egyedi
  kérelem-űrlapok (`FormStatus`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`
  — a super admin hagyja jóvá; `FieldType`: `TEXT`, `TEXTAREA`, `IMAGE`, `FILE`).
- **`AdoptionFollowUp`** – örökbefogadás utáni utánkövetés (`FollowUpStatus`,
  `wellbeing` 1–5, fotó).
- **`Appointment`** – személyes találkozó foglalás (`AppointmentStatus`: `PENDING`,
  `CONFIRMED`, `CANCELLED`, `COMPLETED`; `proposedAt` vs. `confirmedAt`).
- **`Favorite`** – kedvencek (`@@unique([userId, animalId])`).
- **`Review`** – kétirányú értékelés: user → menhely (`shelterId`) **és**
  menhely → örökbefogadó (`targetUserId`), mindkét irányban egyszeri.

### 4.5 Pénzügyek
- **`Campaign`** – adománygyűjtő kampány (user vagy menhely indítja;
  `CampaignStatus`: `PENDING`, `ACTIVE`, `COMPLETED`, `REJECTED` — super admin hagyja jóvá),
  `targetAmount` / `raisedAmount`.
- **`Donation`** – egyszeri adomány, `stripeSessionId`-vel és `paidAt`-tal.
- **`DonationTier` + `Subscription`** – menhelyi havi támogatási csomagok és
  előfizetések (`SubscriptionStatus`: `ACTIVE`, `CANCELLED`, `PAST_DUE`; `stripeSubId`).
- **`Sponsorship`** – „virtuális örökbefogadás”: havi támogatás egy konkrét állatra,
  opcionális publikus „virtuális gazdi" megjelenéssel.

### 4.6 Önkéntesek és ideiglenes befogadók
- **`Volunteer`** (`VolunteerStatus`) + **`VolunteerTask`** (`VolunteerTaskStatus`) +
  **`VolunteerTaskAssignment`** + **`VolunteerAttendance`** (ledolgozott órák).
- **`FosterProfile`** (`FosterStatus`, `preferredTypes`, `canQuarantine`) +
  **`FosterSupplyLog`** – a befogadónak kiadott készlet (a központi készletből levonva).

### 4.7 Kommunikáció és közösség
- **`Conversation` + `Message`** – állathoz kötött chat user és menhely között
  (`@@unique([animalId, userId])`); a `Message.inviteToken` kérelem-meghívót hordozhat,
  `attachmentUrl` csatolmányt.
- **`Notification`** – in-app értesítések; a `NotificationType` enum ~35 értéket fed le
  (kérelem, időpont, önkéntes, foster, kampány, űrlap, adomány, esemény, üzenet,
  utánkövetés, készlet-riasztás, transzfer…). Létrehozás: `lib/notifications.ts`.
- **`AnimalReport`** – elveszett/talált/kóbor bejelentés (`ReportType`: `LOST`,
  `FOUND`, `STRAY`; `ReportStatus`: `ACTIVE`, `RESOLVED`, `CLOSED`), koordinátákkal
  a térképhez.
- **`Event` + `EventRegistration`** – események (`EventType`: `ADOPTION_DAY`,
  `FUNDRAISER`, `VOLUNTEER_DAY`, `OPEN_DAY`, `EDUCATION`, `OTHER`; `EventStatus`,
  `EventRegistrationStatus`).

### 4.8 Kulcs-enumok gyorsreferencia

| Enum | Értékek |
|---|---|
| `Role` | `USER`, `SHELTER_ADMIN`, `SUPER_ADMIN` |
| `AnimalType` | `DOG`, `CAT`, `RABBIT`, `BIRD`, `OTHER` |
| `AnimalStatus` | `AVAILABLE`, `PENDING`, `ADOPTED`, `FOSTER`, `MEDICAL_HOLD` |
| `AnimalSize` | `SMALL`, `MEDIUM`, `LARGE`, `EXTRA_LARGE` |
| `ApplicationStatus` | `INVITED`, `PENDING`, `REVIEWING`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `CampaignStatus` | `PENDING`, `ACTIVE`, `COMPLETED`, `REJECTED` |
| `SubscriptionStatus` | `ACTIVE`, `CANCELLED`, `PAST_DUE` |
| `TransferStatus` | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |

---

## 5. Autentikáció és jogosultságok

### 5.1 NextAuth setup (`lib/auth.ts`)

- **Session-stratégia: JWT** (`session.strategy: "jwt"`), Prisma adapterrel.
- **Providerek:**
  - `CredentialsProvider` – email + bcrypt-jelszó; csak **megerősített e-mail**
    címmel enged be (`EMAIL_NOT_VERIFIED` hibát dob, a regisztráció után a
    `app/api/auth/verify-email` végpont erősít meg).
  - `GoogleProvider` és `FacebookProvider` – csak akkor regisztrálódnak, ha a
    megfelelő env-változók (`GOOGLE_CLIENT_ID` stb.) be vannak állítva.
- **„Jegyezz meg" funkció:** egyedi `jwt.encode` — `rememberMe` esetén 30 nap,
  egyébként 12 óra a token élettartama.
- **Callbackok:** a `jwt` callback a tokenbe teszi az `id`, `role`, `image` mezőket
  (OAuth-bejelentkezésnél DB-ből olvassa a role-t); a `session` callback ezeket
  átmásolja a `session.user`-be. A típusbővítés a `types/next-auth.d.ts`-ben van.
- A NextAuth handler: `app/api/auth/[...nextauth]/route.ts`. A mobilkliens külön
  Bearer-tokenes belépést kap (`app/api/auth/mobile/`, ellenőrzés:
  `lib/mobile-auth.ts` → `getMobileUser()`, jose `jwtVerify`).

### 5.2 Szerepkörök és jogosultság-ellenőrzés

| Szerepkör | Jogosultság |
|---|---|
| `USER` | Publikus oldalak + saját kérelmek, üzenetek, profil, kedvencek |
| `SHELTER_ADMIN` | `/dashboard` + a **saját menhelyéhez** tartozó erőforrások |
| `SUPER_ADMIN` | Minden menhely + platform-szintű jóváhagyások, ETL, `/api/admin/*` |

A jogosultság-ellenőrzés **három rétegben** történik:

1. **Middleware** (`middleware.ts`): védett útvonalak + `/dashboard` role-szűrés.
2. **Layout / page szinten**: a `app/dashboard/layout.tsx` `getServerSession`-nel
   újraellenőrzi a role-t és átirányít.
3. **API route szinten** — minden írási végpont sablonja (lásd pl.
   `app/api/animals/route.ts` POST):

   ```ts
   const session = await getServerSession(authOptions);
   if (!session?.user?.id) return 401;
   const isSuperAdmin   = session.user.role === "SUPER_ADMIN";
   const isShelterAdmin = session.user.role === "SHELTER_ADMIN";
   if (!isSuperAdmin && !isShelterAdmin) return 403;
   // SHELTER_ADMIN esetén a saját menhely feloldása:
   const adminRecord = await prisma.shelterAdmin.findFirst({
     where: { userId: session.user.id },
   });
   ```

   Tehát a shelter admin **soha nem kap** kliensoldalról `shelterId`-t — azt a
   `ShelterAdmin` táblából oldja fel a szerver. A super admin küldhet `shelterId`-t.

---

## 6. API réteg (`app/api/`)

Konvenciók:

- Route Handler-ek (`route.ts`), REST-szerű felépítés: gyűjtemény (`/api/animals`) +
  elem (`/api/animals/[id]`) szinten `GET/POST/PATCH/DELETE`.
- **Zod-validáció** minden írási végponton (`safeParse` → 400 + `error.flatten()`).
- **`getServerSession(authOptions)`** a jogosultsághoz (a middleware nem fedi az API-t).
- Magyar nyelvű hibaüzenetek JSON-ben (`{ error: "..." }`), megfelelő HTTP-státuszokkal.
- Érzékeny végpontokon **rate limit** (`lib/rate-limit.ts`, in-memory, IP-alapú).
- Mellékhatások: `lib/notifications.ts` (in-app) és `lib/email.ts` (SMTP) hívások.

Fontosabb endpoint-csoportok:

| Útvonal | Funkció |
|---|---|
| `/api/auth/*` | NextAuth + register, verify-email, forgot/reset/change-password, resend-verification, mobile login |
| `/api/animals`, `/api/animals/[id]` | Állat CRUD, szűrés/lapozás (`type`, `status`, `size`, `q`, `page`, `limit`) |
| `/api/applications`, `/api/applications/my`, `/api/apply/[token]` | Kérelem beadás, saját kérelmek, meghívó-tokenes kitöltés |
| `/api/application-forms` | Egyedi kérelem-űrlapok (builder + jóváhagyás) |
| `/api/appointments`, `/api/appointments/shelter` | Időpontfoglalás user- és menhely-oldalon |
| `/api/conversations`, `/api/messages`, `/api/messages/unread` | Chat, olvasatlan számláló |
| `/api/checkout/donate` \| `subscribe` \| `sponsor` | Stripe Checkout session létrehozás (lásd 7. fejezet) |
| `/api/webhooks/stripe` | Stripe webhook (fizetés-visszaigazolás) |
| `/api/stripe/connect/onboard` \| `callback` | Stripe Connect onboarding menhelynek/usernek |
| `/api/campaigns`, `/api/subscriptions`, `/api/sponsorships` | Kampányok, előfizetések, virtuális örökbefogadások kezelése |
| `/api/kennels`, `/api/inventory`, `/api/transfers` | Menhely-üzemeltetés (kennelek, készlet, áthelyezések) |
| `/api/volunteers`, `/api/volunteer-tasks`, `/api/foster` | Önkéntes- és foster-kezelés |
| `/api/events`, `/api/favorites`, `/api/reviews`, `/api/reports`, `/api/map` | Események, kedvencek, értékelések, bejelentések, térkép-adatok |
| `/api/followups` | Utánkövetési kérdőívek |
| `/api/notifications`, `/api/notifications/read-all` | Értesítések lekérése / olvasottra állítása |
| `/api/upload/avatar` \| `attachment` \| `document` | Vercel Blob kliensoldali feltöltés (`handleUpload`, típus- és méretkorlátokkal) |
| `/api/dashboard/*` | Admin-aggregátumok (analytics, animals, applications, followups) |
| `/api/admin/*` | SUPER_ADMIN: users, shelters, campaigns kezelése |
| `/api/export` | CSV-export (animals, applications, volunteers, sponsorships, events, subscribers, donations) |
| `/api/etl` | DWH betöltés (lásd 9. fejezet) |
| `/api/seed`, `/api/seed/extras` | Demó-adat feltöltés |

---

## 7. Fizetések (Stripe)

Központi modul: `lib/stripe.ts`.

- `getStripe()` – lusta singleton, csak futásidőben példányosul (build-time nem).
- `PLATFORM_FEE_PERCENT = 4` és `platformFee(amount)` – a platform jutaléka **rákerül**
  az adományozó által szánt összegre: az adományozó `amount + fee`-t fizet, a
  kedvezményezett a teljes `amount`-ot kapja.
- `resolveTransferDestination(accountId)` – ellenőrzi, hogy a tárolt Connect-fiók
  (`acct_…`) létezik-e és `charges_enabled`; ha nem, a platform-fiókra terhel
  (így seed/teszt adatokkal sem omlik össze a checkout).

### 7.1 Checkout flow-k (`app/api/checkout/*`)

| Végpont | Mód | Mit hoz létre |
|---|---|---|
| `POST /api/checkout/donate` | `mode: "payment"` | Egyszeri adomány kampányra → `Donation` rekord + Checkout session (`metadata.donationId`) |
| `POST /api/checkout/subscribe` | `mode: "subscription"` | Havi menhely-támogatás `DonationTier` alapján (`metadata.tierId` + `userId`) |
| `POST /api/checkout/sponsor` | `mode: "subscription"` | Virtuális örökbefogadás egy állatra (`metadata.sponsorAnimalId`, `sponsorAmount`, `sponsorPublic`, `sponsorName`) |

A pénz a `transfer_data.destination`-ön keresztül a menhely / kampánytulajdonos
Connect-fiókjába kerül, a platformdíj levonásával.

### 7.2 Stripe Connect onboarding

1. `POST /api/stripe/connect/onboard` – Express-fiók létrehozása/újrahasznosítása
   (`type: "shelter"` + `shelterId`, vagy `type: "user"`), Account Link visszaadása.
2. A felhasználó kitölti a Stripe-os onboardingot.
3. `GET /api/stripe/connect/callback` – visszairányításkor beállítja a
   `stripeOnboardingComplete = true` mezőt a `Shelter`-en vagy `User`-en.

### 7.3 Webhook flow (`POST /api/webhooks/stripe`)

1. Raw body + `stripe-signature` fejléc → `webhooks.constructEvent` aláírás-ellenőrzés
   (`STRIPE_WEBHOOK_SECRET`).
2. **`checkout.session.completed`** — a `metadata` alapján három ág:
   - `metadata.donationId` → `Donation.paidAt` kitöltése, kampány `raisedAmount`
     növelése, e-mail + in-app értesítés az adminoknak (`DONATION_RECEIVED`).
   - `metadata.tierId + userId` → `Subscription` rekord aktiválása
     (`SUBSCRIPTION_STARTED` értesítés, visszaigazoló e-mail).
   - `metadata.sponsorAnimalId + userId` → `Sponsorship` létrehozása
     (`SPONSORSHIP_STARTED`).
3. **`customer.subscription.deleted`** → a megfelelő `Subscription` és `Sponsorship`
   rekordok `CANCELLED`-re állítása `stripeSubId` alapján.

Lokális teszteléshez: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

---

## 8. Lokalizáció (next-intl)

- **Konfiguráció:** `i18n/routing.ts` — `locales: ["hu", "en", "de", "pl"]`,
  `defaultLocale: "hu"`, `localePrefix: "as-needed"` (magyar URL prefix nélkül),
  `localeDetection: false` (nincs automatikus böngésző-nyelv átirányítás).
- **Üzenetbetöltés:** `i18n/request.ts` a `messages/<locale>.json` fájlt tölti be;
  ismeretlen locale esetén a defaultra esik vissza. A plugin a `next.config.js`-ben
  van bekötve: `require("next-intl/plugin")("./i18n/request.ts")`.
- **Navigáció:** mindig az `i18n/navigation.ts`-ből exportált `Link`, `redirect`,
  `usePathname`, `useRouter` használandó a `next/link` / `next/navigation` helyett —
  ezek locale-tudatosak.
- **Üzenetfájlok:** `messages/hu.json` (referencia), `en.json`, `de.json`, `pl.json`.
  Felső szintű namespace-ek: `nav`, `footer`, `home`, `animals`, `shelters`, `donate`,
  `auth`, `reports`, `help`, `contact`, `common`, `applications`, `profile`,
  `messages`, `dashboard`, `foster`, `events`, `favorites`, `notifications`, `map`.
- **Használat:** kliens-komponensben `useTranslations("animals")`,
  szerver-komponensben `getTranslations` a `next-intl/server`-ből.
- **Új kulcs felvétele:** 1) vedd fel a kulcsot a `messages/hu.json` megfelelő
  namespace-ébe; 2) fordítsd le **mind a négy** fájlban (en/de/pl) — hiányzó kulcs
  futásidejű hibát/feliratkimaradást okoz; 3) használd `t("kulcs")`-csal.
- A `/dashboard` nem lokalizált (fix `hu.json`), ott magyar feliratok vannak.

---

## 9. DWH / ETL

Külön **Data Warehouse** adatbázis (másik Postgres, env: `dwh_POSTGRES_PRISMA_URL`)
**csillagsémával** — `prisma/dwh.prisma`, generált kliens:
`lib/generated/dwh-client`, singleton: `lib/dwh.ts` (`dwh` export).

- **Dimenziók:** `DimDate` (naptár, magyar ünnepnapokkal), `DimShelter`, `DimAnimal`
  (`ageCategory`: PUPPY/YOUNG/ADULT/SENIOR), `DimUser`.
- **Ténytáblák:** `FactAdoption` (jóváhagyott örökbefogadások, `stayDurationDays`,
  `applicationCount`), `FactAnimalInventory` (napi állomány-pillanatkép
  státuszonként, `utilizationRate` = (AVAILABLE+PENDING)/capacity),
  `FactAnimalReport` (bejelentések).
- **`EtlRun`** – futásnapló (időtartam, rekordszámok, log).

Az ETL **full reload**: a `POST /api/etl` (`app/api/etl/route.ts`) az OLTP-ből
egyszerre lekéri az adatokat, törli a DWH-t (tény → dimenzió sorrendben), majd
újratölti. Védelem: `Authorization: Bearer <ETL_SECRET>` fejléc **vagy**
bejelentkezett `SUPER_ADMIN`. A tiszta transzformációs függvények
(`toDateOnly`, `monthName`, `isHungarianHoliday`, `computeAgeCategory`,
`computeStayDurationDays`) a `lib/etl-helpers.ts`-ben vannak és unit-teszteltek.
Az admin analytics (`/api/dashboard/analytics`, `components/dashboard/analytics-section.tsx`)
erre a DWH-ra épül.

Parancsok: `npm run dwh:generate`, `npm run dwh:push` (a `build` script mindkét
sémára futtat `prisma generate` + `db push`-t).

---

## 10. Tesztelés

### 10.1 Unit tesztek — Vitest (`tests/`)

- Konfig: `vitest.config.ts` (`environment: "node"`, `@` alias a projektgyökérre,
  `tests/**/*.test.ts`).
- Jelenlegi tesztek: `tests/etl-helpers.test.ts` (ETL transzformációk) és
  `tests/stripe.test.ts` (platformdíj-számítás).
- Futtatás: `npm run test` | `npm run test:watch` | `npm run test:coverage`.

### 10.2 E2E tesztek — Playwright (`e2e/`)

- Konfig: `playwright.config.ts`. Három projekt:
  - **`setup`** (`e2e/auth.setup.ts`) – bejelentkezik és auth state-et ment az
    `e2e/.auth/admin.json` / `user.json` fájlokba;
  - **`guest`** – vendég tesztek (`homepage`, `auth`, `animals-shelters` spec-ek);
  - **`admin`** – `dashboard.spec.ts`, a mentett admin storageState-tel,
    `dependencies: ["setup"]`.
- A config automatikusan elindítja a dev szervert (`webServer: npm run dev`,
  `http://localhost:3000`), `workers: 1`, nem párhuzamos.
- Futtatás: `npm run test:e2e` (guest) | `npm run test:e2e:admin` | `npm run test:e2e:all`.

### 10.3 Kapcsolat a docs/ tesztesetekkel

A `docs/01-auth.md` … `docs/17-settings-tiers.md` fájlok **manuális, user story-alapú
teszteseteket** írnak le (TC-XX-YY azonosítókkal, összesen ~111 db) — területenként
lefedve az auth-tól a super admin funkciókig (lásd `docs/README.md`). Az e2e tesztek
ezek egy részét automatizálják (auth, állat-böngészés, dashboard smoke-tesztek); új
funkció fejlesztésekor a megfelelő teszteset-dokumentumot is frissíteni kell.

---

## Függelék: fontos környezeti változók

| Változó | Mire kell |
|---|---|
| `DATABASE_URL` | OLTP PostgreSQL |
| `dwh_POSTGRES_PRISMA_URL`, `dwh_POSTGRES_URL_NON_POOLING` | DWH PostgreSQL |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth JWT + URL-ek |
| `GOOGLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET` | OAuth providerek (opcionális) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe API + webhook aláírás |
| `NEXT_PUBLIC_APP_URL` | Checkout redirect URL-ek alapja |
| `SMTP_HOST/PORT/USER/PASS/FROM` | nodemailer e-mail küldés |
| `ETL_SECRET` | `/api/etl` Bearer-token |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob feltöltés |
