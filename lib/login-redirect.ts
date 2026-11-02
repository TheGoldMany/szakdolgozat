/**
 * A belépő oldal címe úgy, hogy belépés után a felhasználó oda kerüljön
 * vissza, ahonnan jött (pl. a kedvencnek jelölt állat oldalára, ne a
 * főoldalra). A `callbackUrl` nyelvi előtag nélküli: a belépő oldal a
 * next-intl routerével navigál, az teszi elé az aktuális nyelvet.
 */
export function loginHrefFromHere(): string {
  const path = window.location.pathname.replace(/^\/(en|de|pl)(?=\/|$)/, "") || "/";
  return `/auth/login?callbackUrl=${encodeURIComponent(path + window.location.search)}`;
}
