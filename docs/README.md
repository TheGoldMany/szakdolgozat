# ÁllatiMenhelyek.hu – Tesztdokumentáció és Onboarding

> Ez a mappa tartalmazza a platform összes fő funkciójának **User Story-alapú tesztdokumentációját**.  
> Célja: csapat onboarding, QA tesztelés, és thesis-bemutató dokumentáció.

---

## Tartalomjegyzék

| Fájl | Terület | Tesztesetek |
|---|---|---|
| [01-auth.md](./01-auth.md) | Regisztráció, bejelentkezés, OAuth | TC-01-01 – TC-01-06 |
| [02-animals.md](./02-animals.md) | Állat böngészés, szűrés, kedvencek | TC-02-01 – TC-02-07 |
| [03-adoption.md](./03-adoption.md) | Örökbefogadási kérelem teljes folyamat | TC-03-01 – TC-03-08 |
| [04-shelters-reviews.md](./04-shelters-reviews.md) | Menhely profil, értékelések | TC-04-01 – TC-04-05 |
| [05-appointments.md](./05-appointments.md) | Időpontfoglalás (user + admin) | TC-05-01 – TC-05-06 |
| [06-messages.md](./06-messages.md) | Üzenetváltás | TC-06-01 – TC-06-05 |
| [07-donations.md](./07-donations.md) | Kampányok, előfizetések, Stripe | TC-07-01 – TC-07-07 |
| [08-volunteers-foster.md](./08-volunteers-foster.md) | Önkéntesség, ideiglenes befogadás | TC-08-01 – TC-08-08 |
| [09-reports-map.md](./09-reports-map.md) | Bejelentések, interaktív térkép | TC-09-01 – TC-09-06 |
| [10-notifications.md](./10-notifications.md) | Értesítési rendszer | TC-10-01 – TC-10-05 |
| [11-dashboard.md](./11-dashboard.md) | Admin dashboard: állatok, kérelmek, készlet | TC-11-01 – TC-11-12 |
| [12-superadmin.md](./12-superadmin.md) | Super Admin: felhasználók, menhelyek | TC-12-01 – TC-12-06 |
| [13-profile.md](./13-profile.md) | Profil, avatar, jelszóváltás, nyelvváltás | TC-13-01 – TC-13-06 |
| [14-followups.md](./14-followups.md) | Örökbefogadás utáni utánkövetés | TC-14-01 – TC-14-06 |
| [15-events.md](./15-events.md) | Események (publikus + admin) | TC-15-01 – TC-15-07 |
| [16-forms-kennels-transfers.md](./16-forms-kennels-transfers.md) | Kérvénysablonok, kennelek, áthelyezések | TC-16-01 – TC-16-09 |
| [17-settings-tiers.md](./17-settings-tiers.md) | Menhely beállítások, Stripe Connect, támogatói szintek | TC-17-01 – TC-17-07 |

**Összesen: ~111 teszteset**

> Rendszer-architektúra áttekintés új fejlesztőknek: [ARCHITECTURE.md](./ARCHITECTURE.md)

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
npm run prisma:migrate
npm run prisma:seed:demo       # demo adatokkal (ajánlott)
npm run dev
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
- A unit tesztek a `tests/` mappában, futtatás: `npm run test`.
