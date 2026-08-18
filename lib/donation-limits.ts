/**
 * Fizetési határértékek — szándékosan függőség nélküli fájl.
 *
 * A kliens oldali űrlapok és a szerveroldali validáció ugyanezt a számot
 * használja. Nem a `lib/stripe.ts`-ben van, mert az importálja a Stripe SDK-t,
 * és egy kliens komponensből behúzva az a teljes SDK-t bevinné a böngésző
 * bundle-jébe.
 *
 * A Stripe fix díja (25 Ft) ez alatt aránytalanul nagy részt vinne el: 500
 * Ft-nál a támogatóra terhelt díj ~12%, 100 Ft-nál már 32% lenne. A virtuális
 * örökbefogadás is ezt a határt használja.
 */
export const MIN_DONATION_HUF = 500;
