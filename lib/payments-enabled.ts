/**
 * A fizetési funkciók kapcsolója.
 *
 * MIÉRT VAN
 *
 * Az adományozás, a havi támogatói csomagok és a virtuális örökbefogadás
 * egyelőre nem mehet élesbe: a platform az állatsegítő funkciókra fókuszál,
 * a fizetés pedig fejlesztés alatt marad. A kód és az adatbázis MARAD — csak
 * éles környezetben nem érhető el.
 *
 * MIÉRT NEM TÖRLÉS
 *
 * A séma-modellek eldobása (`Donation`, `Subscription`, `Sponsorship`,
 * `Campaign`) `db push`-sal visszafordíthatatlan adatvesztés lenne, és a
 * pénzügyi rekordokat a `purge-accounts` saját kommentje szerint nyolc évig
 * meg kell őrizni. Egy kapcsoló ugyanazt éri el, és egy env változóval
 * vissza is kapcsolható.
 *
 * MIÉRT „TRUE" KELL AZ ENGEDÉLYEZÉSHEZ
 *
 * A kapcsoló ZÁRVA bukik: ha a változó hiányzik, elgépelték, vagy egy új
 * környezetben elfelejtették beállítani, a fizetés KI van kapcsolva. A
 * fordítottja — ahol a hiányzó változó bekapcsolva hagyná — azt jelentené,
 * hogy egy elfelejtett beállítás valódi pénzt enged be. Pénznél a kellemetlen
 * hiba mindig jobb, mint a kényelmes.
 *
 * BEÁLLÍTÁS
 *
 *   • Éles (production):  ne állítsd be, vagy `false` → ki
 *   • Preview / fejlesztés: `NEXT_PUBLIC_PAYMENTS_ENABLED=true` → be
 *
 * A `NEXT_PUBLIC_` előtag kell, mert kliens komponensek is kérdezik (a
 * fejléc, a lábléc és a mobil alsó sáv). Nem titok: a kapcsoló állása a
 * felületből amúgy is látszik.
 *
 * FÜGGŐSÉG NÉLKÜLI FÁJL, szándékosan — kliensből is importálható anélkül,
 * hogy bármilyen szerveroldali modult behúzna.
 */
export function paymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
}
