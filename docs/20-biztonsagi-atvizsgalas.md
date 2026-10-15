# 20 – Élesítés előtti biztonsági átvizsgálás

Dátum: 2026-10-15 · Commitok: `95b0fc4` … `6e2a9bc` (hat rész)

Minden pontnál: **mit találtunk**, **mit javítottunk**, és ahol nem
javítottunk, **miért nem**. A „rendben" azt jelenti, hogy ellenőriztük és
nem kellett hozzányúlni.

## 1. Titkosítás és hitelesítő adatok

| Pont | Állapot | Mi történt |
|---|---|---|
| Hide API keys | **Javítva — kritikus** | A `prisma/reset-prod.ts` az éles SUPER_ADMIN jelszót tartalmazta nyílt szövegben (publikus repó, prodban is). Mostantól env változóból, alapérték nélkül, kimondott megerősítéssel (`CONFIRM_RESET=TÖRLÉS`). Négy helyen `NEXTAUTH_SECRET ?? "fallback"` állt: hiányzó titoknál nyilvános szóval írtuk volna alá a mobil-JWT-t → `requireSecret()`, ami megáll. |
| Purge Git secrets | **Nem írtuk át a történetet** | A jelszó a git történetben marad. A repó publikus, tehát már kiszivárgott; a történet átírása ezt nem vonja vissza, viszont minden ágat és PR-hivatkozást eltör. **A valódi javítás a jelszó cseréje az éles fiókon.** |
| Use public DB key | Nem értelmezhető / rendben | Supabase-fogalom. Itt Prisma + Postgres: a `DATABASE_URL` csak szerveroldalon él; a kliensre kerülő `NEXT_PUBLIC_` változók között titok nincs. |
| Encrypt sensitive data | **Javítva** | A jelszó-visszaállító és az e-mail-megerősítő token nyílt szövegben állt az adatbázisban → SHA-256 hash, a nyers érték csak e-mailben megy ki. |
| Hash passwords | Rendben + egységesítve | Mindenhol bcrypt volt; a költség helyenként 10 vagy 12 → egységesen 12. A 72 bájtnál hosszabb jelszó elutasítva (a bcrypt csendben levágná). |

## 2. Adatbázis és hozzáférés

| Pont | Állapot | Mi történt |
|---|---|---|
| Row-level security | Ekvivalens ellenőrizve | Prisma alatt nincs adatbázis-szintű RLS; minden végpont maga ellenőrzi a tagságot/tulajdonost. Ezt végpontonként átnéztük. |
| Enforce server-side auth | **Javítva** | A szerepkör 30 napig a tokenben élt (web és mobil): egy lefokozott admin 30 napig bejutott. Mobilon kérésenként, weben ötpercenként az adatbázisból frissül. |
| Lock record access | **Javítva** | Az `inventory`, `events`, `volunteer-tasks` lista a `?shelterId=`-t ellenőrzés nélkül fogadta: bárki olvashatta bármelyik menhely készletét → `permittedShelterIds()`. |
| Block field tampering | Rendben | Nyers kérés-törzs sehol nem kerül az adatbázisba; a kliens által küldött `shelterId` minden admin-írásnál a tagsághoz van kötve. |

## 3. Hálózat és session

| Pont | Állapot | Mi történt |
|---|---|---|
| Secure session cookie | **Javítva** | A NextAuth a `Secure` sütit csak `https://` NEXTAUTH_URL mellett kapcsolta be → Vercelen kötelező. A menhely-váltó süti is Secure. |
| Force HTTPS | **Javítva** | HSTS fejléc (preload nélkül — az külön döntés). A Vercel maga is átirányít. |
| Add security headers | **Javítva** | Egy sem volt. Most: HSTS, frame-ancestors + X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, `X-Powered-By` ki. A CSP-ben szándékosan nincs `script-src` (a Next 14/15 inline szkriptjei miatt csak `'unsafe-inline'`-nal menne). |

## 4. Bemenet és védelem

| Pont | Állapot | Mi történt |
|---|---|---|
| Parameterize queries | Rendben | Nyers SQL a futó kódban nincs; a Prisma paraméterez. |
| Validate all input | **Javítva** | A térkép API szűrői validálatlanok voltak (500-at adtak). |
| Escape user content | **Javítva** | A `z.string().url()` elfogadja a `javascript:`-t, a React 18 lefuttatja → `safeHref()` a bevitelnél és a megjelenítésnél. A cikk JSON-LD-je `</script>`-tel kitörhető volt. A térkép HTML-buborékjai rendben voltak (escape-elve). |
| Restrict file uploads | **Javítva** | 16 végpont tetszőleges kép-/fájl-URL-t fogadott (követőpixel, adathalász-link) → csak a saját Vercel Blob tárhely. A nyitott képproxy (`hostname: "**"`) lezárva. Az anonim feltöltés korlátot kapott, a fájlnevek véletlen utótagot. |

## 5. API és rate limiting

| Pont | Állapot | Mi történt |
|---|---|---|
| Rate limit login | **Javítva** | A webes és a mobil belépés korlátlan próbálkozást engedett → 10/IP és 5/e-mail 15 percenként. |
| Add bot protection | **Javítva** | Az anonim bejelentés korlátot és csali mezőt (honeypot) kapott; a `/reports/[id]/match` (Claude Vision + menhely-értesítés) csak friss bejelentésre, egyszer fut. |
| Trim API responses | **Javítva** | A lezárt bejelentések telefonszáma `?status=ALL`-lal egyben lekérhető volt; a bejelentő elérhetősége örökre nyilvános volt; a viselkedési napló és az állatdokumentumok bejelentkezés nélkül olvashatók voltak. |

## 6. Függőségek

| Pont | Állapot | Mi történt |
|---|---|---|
| Scan dependencies | **Javítva (éles: 0)** | 11 sebezhetőség, ebből 2 kritikus (Next.js RCE). Next 14 → 15.5.28 (a 14-es vonalra nincs javítás), React 18 marad. A nem használt `nodemailer` eltávolítva. `npm audit --omit=dev` → **0**. |

## Ismert korlátok, amik nyitva maradtak

- **A rate limiter memóriában, példányonként tárol.** Vercelen minden
  szerverless példánynak saját számlálója van; egy elosztott támadás ellen
  csak részleges védelem. A tartós megoldás egy közös tár (Upstash / Vercel KV).
- **Fejlesztői függőségek:** 15 sebezhetőség maradt a tesztfuttatóban, a
  lintben és a Tailwind build-eszközeiben. Nem kerülnek a prodba; a
  javításukat egy npm-belső hiba (`edgesOut`) blokkolja.
- **Mobilapp függőségei:** az Expo SDK rögzíti a natív modulok verzióit, ezért
  csak `npx expo install --fix`-szel és EAS builddel ellenőrizve frissíthetők.
- **A dokumentumok nyilvános URL-en élnek** (Vercel Blob public store). A
  véletlen utótag miatt kitalálhatatlanok, de egy kiszivárgott link mindenkinek
  működik. Privát tár + aláírt URL lenne a teljes megoldás.
- **Teljes CSP (`script-src`) nonce-szal** — a middleware-be kellene bekötni.
