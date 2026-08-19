/**
 * Cikkek keresőoptimalizálása.
 *
 * Fontos elvárás-tisztázás: a `<meta name="keywords">` címkét a Google 2009 óta
 * figyelmen kívül hagyja, tehát önmagában egyetlen kulcsszómező sem gyorsítja a
 * megjelenést. Amit a kulcsszavak nálunk valóban csinálnak:
 *   • a fő kulcsszó a szerkesztői visszajelzés alapja (szerepel-e a címben, a
 *     leírásban, a szöveg elején, a slugban),
 *   • a címszavak böngészhető gyűjtőoldalt kapnak, ami valódi belső
 *     hivatkozásokat ad, és ez tényleg számít az indexelésnél.
 *
 * A gyorsabb megjelenést ezen felül a sitemap (lastmod-dal), a kanonikus URL és
 * a strukturált adat (JSON-LD) hozza – ezek a cikkoldalon vannak bekötve.
 *
 * Függőségmentes fájl: a szerkesztő (kliens) és a szerver is importálja.
 */

/** A Google nagyjából ennyit mutat a címből, mielőtt levágja. */
export const SEO_TITLE_MAX = 60;
/** A leírás ajánlott hossza; ennél rövidebb kihasználatlan, hosszabb levágódik. */
export const SEO_DESC_MIN = 120;
export const SEO_DESC_MAX = 160;

export type CheckStatus = "ok" | "warn" | "bad";

export interface SeoCheck {
  id:      string;
  label:   string;
  status:  CheckStatus;
  /** Mit tegyen a szerző, ha nem „ok”. */
  hint?:   string;
}

export interface SeoInput {
  title:           string;
  seoTitle?:       string | null;
  metaDescription?: string | null;
  excerpt?:        string | null;
  content:         string;
  focusKeyword?:   string | null;
  slug?:           string | null;
  imageUrl?:       string | null;
  tags?:           string[];
}

/** Ékezet- és kisbetű-független összehasonlításhoz. */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function contains(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false;
  return normalise(haystack).includes(normalise(needle.trim()));
}

/** A keresőben ténylegesen megjelenő cím (a `seoTitle` felülírja a címet). */
export function effectiveTitle(input: Pick<SeoInput, "title" | "seoTitle">): string {
  return (input.seoTitle?.trim() || input.title || "").trim();
}

/** A keresőben megjelenő leírás; tartalék a bevezető, majd a szöveg eleje. */
export function effectiveDescription(
  input: Pick<SeoInput, "metaDescription" | "excerpt" | "content">
): string {
  const explicit = input.metaDescription?.trim();
  if (explicit) return explicit;

  const excerpt = input.excerpt?.trim();
  if (excerpt) return excerpt;

  const plain = (input.content ?? "").replace(/\s+/g, " ").trim();
  return plain.length > SEO_DESC_MAX ? `${plain.slice(0, SEO_DESC_MAX - 1)}…` : plain;
}

/**
 * Szerkesztői ellenőrzőlista. Nem pontszámot ad, hanem konkrét teendőket –
 * a szerző így tudja, mit érdemes még megírni.
 */
export function analyseSeo(input: SeoInput): SeoCheck[] {
  const checks: SeoCheck[] = [];

  const title    = effectiveTitle(input);
  const desc     = effectiveDescription(input);
  const keyword  = input.focusKeyword?.trim() ?? "";
  const content  = input.content ?? "";
  // A kulcsszót a szöveg elején keressük: ott többet ér, mint a végén.
  const opening  = content.replace(/\s+/g, " ").trim().slice(0, 300);

  // ── Cím ────────────────────────────────────────────────────────────────
  checks.push(
    title.length === 0
      ? { id: "title", label: "Keresőcím", status: "bad", hint: "A cikknek nincs címe." }
      : title.length > SEO_TITLE_MAX
      ? { id: "title", label: "Keresőcím", status: "warn",
          hint: `${title.length} karakter – a Google nagyjából ${SEO_TITLE_MAX} után levágja.` }
      : { id: "title", label: "Keresőcím", status: "ok" }
  );

  // ── Leírás ─────────────────────────────────────────────────────────────
  checks.push(
    desc.length === 0
      ? { id: "desc", label: "Meta leírás", status: "bad",
          hint: "Írj leírást, különben a Google a szöveg egy véletlen részletét mutatja." }
      : desc.length < SEO_DESC_MIN
      ? { id: "desc", label: "Meta leírás", status: "warn",
          hint: `${desc.length} karakter – ${SEO_DESC_MIN}–${SEO_DESC_MAX} között használható ki a hely.` }
      : desc.length > SEO_DESC_MAX
      ? { id: "desc", label: "Meta leírás", status: "warn",
          hint: `${desc.length} karakter – ${SEO_DESC_MAX} felett levágódik.` }
      : { id: "desc", label: "Meta leírás", status: "ok" }
  );

  // ── Fő kulcsszó ────────────────────────────────────────────────────────
  if (!keyword) {
    checks.push({
      id: "keyword", label: "Fő kulcsszó", status: "warn",
      hint: "Add meg, mire keresve találják meg a cikket – ez alapján tudunk visszajelzést adni.",
    });
  } else {
    checks.push(
      contains(title, keyword)
        ? { id: "kw-title", label: "Kulcsszó a címben", status: "ok" }
        : { id: "kw-title", label: "Kulcsszó a címben", status: "warn",
            hint: "A címben szereplő kulcsszó súlyozottan számít." }
    );
    checks.push(
      contains(desc, keyword)
        ? { id: "kw-desc", label: "Kulcsszó a leírásban", status: "ok" }
        : { id: "kw-desc", label: "Kulcsszó a leírásban", status: "warn",
            hint: "A találatban vastagon jelenik meg, ha egyezik a kereséssel." }
    );
    checks.push(
      contains(opening, keyword)
        ? { id: "kw-intro", label: "Kulcsszó a bevezetőben", status: "ok" }
        : { id: "kw-intro", label: "Kulcsszó a bevezetőben", status: "warn",
            hint: "Az első bekezdésben is szerepeljen, ne csak később." }
    );
    if (input.slug) {
      checks.push(
        contains(input.slug, keyword.replace(/\s+/g, "-"))
          ? { id: "kw-slug", label: "Kulcsszó az URL-ben", status: "ok" }
          : { id: "kw-slug", label: "Kulcsszó az URL-ben", status: "warn",
              hint: "Az URL a címből készül; ha a kulcsszó a címben van, ide is bekerül." }
      );
    }
  }

  // ── Tartalom hossza ────────────────────────────────────────────────────
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  checks.push(
    words >= 300
      ? { id: "length", label: "Szöveg hossza", status: "ok" }
      : { id: "length", label: "Szöveg hossza", status: "warn",
          hint: `${words} szó – a rövid cikkeket a kereső ritkán hozza előre.` }
  );

  // ── Borítókép ──────────────────────────────────────────────────────────
  checks.push(
    input.imageUrl
      ? { id: "image", label: "Borítókép", status: "ok" }
      : { id: "image", label: "Borítókép", status: "warn",
          hint: "Megosztásnál és a hírösszefoglalókban is ez jelenik meg." }
  );

  // ── Címszavak ──────────────────────────────────────────────────────────
  checks.push(
    (input.tags?.length ?? 0) > 0
      ? { id: "tags", label: "Címszavak", status: "ok" }
      : { id: "tags", label: "Címszavak", status: "warn",
          hint: "A címszavak gyűjtőoldala belső hivatkozást ad a cikknek." }
  );

  return checks;
}

/** Címszó URL-barát alakja a gyűjtőoldalhoz. */
export function tagSlug(tag: string): string {
  return normalise(tag)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** Kulcsszó- és címszólista tisztítása: trim, üresek és duplikátumok ki. */
export function cleanTermList(values: unknown, max = 20): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const value = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!value) continue;
    const key = normalise(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}
