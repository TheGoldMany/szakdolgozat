import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";

/**
 * Jelszavak és egyszer használatos tokenek — egy helyen.
 *
 * MIÉRT KÖZÖS
 *
 * A bcrypt-költség eddig hívási helyenként más volt (a regisztráció 10-zel, a
 * jelszócsere 12-vel hash-elt), vagyis attól függően volt gyengébb egy fiók
 * jelszava, hogy melyik úton hozták létre. Egy konstans, egy függvény.
 */

/** 12 → egy hash ~250 ms. Bejelentkezésnél nem érezhető, tömeges törésnél ~4× lassabb a 10-nél. */
const BCRYPT_COST = 12;

export const PASSWORD_MIN = 8;

/**
 * A bcrypt 72 BÁJT után csendben levágja a bemenetet: két jelszó, ami csak a
 * 73. bájttól tér el, ugyanannak számít. Bájtban kell mérni, nem karakterben —
 * egy ékezetes betű UTF-8-ban két bájt.
 */
export const PASSWORD_MAX_BYTES = 72;

export function passwordTooLong(password: string): boolean {
  return Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * Egyszer használatos token: a felhasználó a NYERS értéket kapja e-mailben, az
 * adatbázisba csak a HASH-e kerül.
 *
 * MIÉRT: a jelszó-visszaállító token eddig nyílt szövegben állt az
 * adatbázisban. Egy kiszivárgott mentésből vagy egy olvasható lekérdezésből
 * bárki átvehette volna bármelyik fiókot, amelyhez épp függő visszaállítás
 * van — a token ugyanis maga a belépés. Hash-elve az adatbázis tartalma
 * önmagában nem elég hozzá.
 *
 * SHA-256 és nem bcrypt, mert a token 256 bit véletlen: nincs mit
 * szótárazni rajta, a lassú hash csak a keresést tenné lehetetlenné (a
 * bcrypt sózott, tehát nem lehetne vele `where: { token }`-nel keresni).
 */
export function newOneTimeToken(): { raw: string; hashed: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hashed: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
