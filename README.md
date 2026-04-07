# MenhelyAdopt – Menhelyi Örökbefogadási Platform

Egy teljes körű webalkalmazás, amelyen keresztül állami és civil menhelyek közzétehetik örökbefogadható állataikat, a látogatók böngészhetnek, kedvenclistát kezelhetnek, és örökbefogadási kérelmet nyújthatnak be.

## Tech Stack

| Réteg | Technológia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Nyelv | TypeScript |
| Stílus | Tailwind CSS |
| ORM | Prisma |
| Adatbázis | PostgreSQL |
| Auth | NextAuth.js v4 |
| Validáció | Zod + React Hook Form |

## Projekt struktúra

```
.
├── app/
│   ├── api/              # API route-ok (NextAuth, állatok, kérelmek…)
│   ├── dashboard/        # Admin felület (menhely-adminok, superadmin)
│   ├── animals/          # Állat lista és részletes oldal
│   ├── shelters/         # Menhely lista és részletes oldal
│   ├── auth/             # Bejelentkezés / regisztráció oldalak
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Főoldal
├── components/
│   ├── ui/               # Általános UI elemek (Button, Card, Badge…)
│   ├── animals/          # Állat-specifikus komponensek
│   ├── shelters/         # Menhely-specifikus komponensek
│   └── layout/           # Header, Footer, Sidebar
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   ├── auth.ts           # NextAuth konfiguráció
│   ├── validations/      # Zod sémák
│   └── utils.ts          # Segédfüggvények
└── prisma/
    ├── schema.prisma     # Adatbázis séma
    └── seed.ts           # Fejlesztési adatok
```

## Gyors indítás

### 1. Függőségek telepítése

```bash
npm install
```

### 2. Környezeti változók

```bash
cp .env.example .env
```

Töltsd ki a `.env` fájlt:
- `DATABASE_URL` – PostgreSQL kapcsolat string
- `NEXTAUTH_SECRET` – véletlenszerű titkos kulcs (`openssl rand -base64 32`)
- `NEXTAUTH_URL` – fejlesztésben `http://localhost:3000`

### 3. Adatbázis inicializálása

```bash
# Migráció futtatása
npm run prisma:migrate

# Prisma Client generálása
npm run prisma:generate

# (Opcionális) Seed adatok betöltése
npm run prisma:seed
```

### 4. Fejlesztői szerver

```bash
npm run dev
```

Az app elérhető: [http://localhost:3000](http://localhost:3000)

---

## Adatbázis séma – főbb modellek

```
User ──< AdoptionApplication >── Animal ──< AnimalImage
 │                                  │
 └──< Favorite >────────────────────┘
 │
 └──< ShelterAdmin >── Shelter ──< Animal
```

### Szerepkörök (Role)

| Szerepkör | Jogosultságok |
|---|---|
| `USER` | Böngészés, kedvencek, kérelem beküldése |
| `SHELTER_ADMIN` | Saját menhely állatainak kezelése, kérelmek elbírálása |
| `SUPER_ADMIN` | Teljes hozzáférés, menhelyek jóváhagyása |

### Állat státuszok (AnimalStatus)

| Státusz | Leírás |
|---|---|
| `AVAILABLE` | Örökbefogadható |
| `PENDING` | Kérelem elbírálás alatt |
| `ADOPTED` | Már örökbefogadták |
| `FOSTER` | Átmeneti gondozásban |
| `MEDICAL_HOLD` | Orvosi kezelés alatt |

---

## Fontosabb API végpontok

| Metódus | Útvonal | Leírás |
|---|---|---|
| GET | `/api/animals` | Állat lista (szűrők, lapozás) |
| GET | `/api/animals/[id]` | Állat részletei |
| POST | `/api/animals` | Új állat (SHELTER_ADMIN) |
| GET | `/api/shelters` | Menhely lista |
| POST | `/api/applications` | Kérelem beküldése |
| GET | `/api/applications` | Saját kérelmek |
| GET | `/api/auth/[...nextauth]` | NextAuth kezelő |

---

## Fejlesztői eszközök

```bash
# Prisma Studio (vizuális DB-szerkesztő)
npm run prisma:studio

# Lint
npm run lint

# Build ellenőrzés
npm run build
```

---

## Licenc

RUK © 2026 – Szakdolgozat projekt
