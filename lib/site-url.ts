/**
 * A publikus oldal alap-URL-je.
 *
 * A projektben két környezeti változó jelöli ugyanazt: a `NEXTAUTH_URL` (az
 * auth miatt kell) és a `NEXT_PUBLIC_APP_URL`. Ha a kettő eltér, a sitemapban
 * szereplő cím és az oldalon kiadott kanonikus URL nem egyezik – a Google
 * ilyenkor a sitemap-bejegyzést nem-kanonikusnak tekinti, és jellemzően nem
 * indexeli az oldalt. Ezért a keresőnek szánt címeket egyetlen helyen oldjuk fel.
 *
 * A záró perjelet levágjuk, hogy a `${siteUrl()}/articles/...` összefűzés ne
 * adjon dupla perjelet.
 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://allatimenhelyek.hu";
  return raw.trim().replace(/\/+$/, "");
}
