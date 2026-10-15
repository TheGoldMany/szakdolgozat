/**
 * Kötelező titkok olvasása — hiányukban MEGÁLLUNK, nem helyettesítünk.
 *
 * MIÉRT
 *
 * Négy helyen állt `process.env.NEXTAUTH_SECRET ?? "fallback"` (vagy
 * `?? "secret"`). Ha a változó egyszer hiányzott volna — új környezet,
 * elgépelt név, egy preview deploy —, a mobil-JWT-ket a NYILVÁNOS „fallback"
 * szóval írtuk volna alá. A forrás publikus, tehát bárki hamisíthatott volna
 * tokent tetszőleges felhasználó nevében, `role: SUPER_ADMIN`-nal. A
 * leiratkozó linkek HMAC-ja ugyanígy.
 *
 * Egy aláíró kulcsnál a csendes alapérték nem kényelem, hanem kiskapu: a
 * hibát nem látja senki, a rendszer „működik". A kivétel viszont azonnal
 * látszik a naplóban.
 *
 * LUSTÁN olvasunk, függvényhíváskor és nem modulbetöltéskor: a `next build`
 * az útvonal-modulokat betölti, és a buildkörnyezetben a titok jogosan
 * hiányozhat.
 */
export function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length < 16) {
    throw new Error(`${name} nincs beállítva (vagy 16 karakternél rövidebb).`);
  }
  return value;
}

/** A mobil-JWT aláíró kulcsa, `jose` által várt alakban. */
export function jwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(requireSecret("NEXTAUTH_SECRET"));
}
