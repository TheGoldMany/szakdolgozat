/**
 * Közösségi poszt-generátor menhelyi tartalomhoz.
 *
 * Két belépési pont, KÉT KÜLÖNBÖZŐ hangnemmel:
 *  - generateAnimalPost(): gazdikereső állat → személyiség-központú, kötődést
 *    épít. A cél, hogy valaki megszeresse, ne hogy adatot olvasson.
 *  - generateReportPost(): elveszett/talált bejelentés → tárgyilagos, pontos,
 *    sürgető. Itt a humor árt: aki keresi az állatát, nem viccet akar olvasni,
 *    és a megosztónak pontos adatra van szüksége.
 *
 * A `lib/vision.ts` mintáját követi: ugyanaz az SDK, és ha az
 * ANTHROPIC_API_KEY nincs beállítva, NEM dob hibát, hanem egy egyszerű
 * sablonra esik vissza az adatokból. A rendszernek AI nélkül is működnie kell —
 * a poszt-generálás kényelmi funkció, nem előfeltétel.
 *
 * ADATVÉDELEM (nem opcionális): a `contactName`, `contactPhone`,
 * `contactEmail`, `address`, `lat` és `lng` SOHA nem kerülhet a generált
 * szövegbe. A poszt a VÁROSIG mehet el, nem tovább. Ezt két rétegben tartjuk:
 *
 *   1. A modell meg sem kapja őket — a prompt kifejezett engedélyezőlistából
 *      épül, nem a teljes rekordból. Ez az igazi védelem.
 *   2. A kimenetet (és a bemeneti szabad szöveget) átfésüljük — mert a
 *      `description` mezőt a BEJELENTŐ írja, és simán beleírhat telefonszámot
 *      vagy címet. Az 1. réteg erre nem véd: az az adat nem a tiltott
 *      mezőkben van, hanem a megengedett leírásban.
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { ANIMAL_TYPE_LABELS } from "@/lib/foster";
import { siteUrl } from "@/lib/site-url";
import type { AnimalSize, ReportType } from "@prisma/client";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export function isSocialPostEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ---------------------------------------------------------------------------
// Közös alak
// ---------------------------------------------------------------------------

export interface SocialPost {
  /** Főszöveg: Facebook-poszt hossz, bekezdésekkel. */
  text: string;
  /** Rövid változat Story-ra / Instagramra – egy-két mondat. */
  short: string;
  /** Hashtagek `#`-kel együtt, hogy másolás után azonnal használható legyen. */
  hashtags: string[];
  /**
   * Melyik MEGLÉVŐ képet ajánljuk a poszthoz. Nem generálunk képet, csak
   * választunk: az elsődlegest, különben a sorrend szerinti elsőt.
   */
  imageUrl: string | null;
  /** A poszthoz tartozó publikus oldal címe. */
  url: string;
  /**
   * Igaz, ha a modell írta; hamis, ha a tartalék sablon.
   * A felületnek tudnia kell, mert a sablon szövege szikárabb, és érdemes
   * lehet kézzel átírni.
   */
  generated: boolean;
}

const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text:     { type: "string" },
    short:    { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
  },
  required: ["text", "short", "hashtags"],
} as const;

// ---------------------------------------------------------------------------
// Adatvédelmi fésű
// ---------------------------------------------------------------------------

/**
 * Kapcsolati adatok kivágása szabad szövegből.
 *
 * MIÉRT KELL, ha a tiltott mezőket amúgy sem adjuk át: mert a `description`-t
 * a bejelentő írja, és gyakran beleírja a telefonszámát („hívj a 06...").
 * Az a szám a megengedett mezőben van, tehát az engedélyezőlista nem fogja ki.
 *
 * Két lépés: a rekord SAJÁT értékeinek szó szerinti kivágása (a legpontosabb),
 * majd általános minták (telefon, e-mail) azokra az esetekre, amikor a szövegbe
 * írt szám nem egyezik a mezőben lévővel.
 */
function scrubContact(
  input: string,
  secrets: (string | null | undefined)[],
): string {
  let out = input;

  for (const secret of secrets) {
    const value = secret?.trim();
    // A nagyon rövid értékek (1-3 karakter) kivágása többet rontana, mint
    // használ: egy „Jó" nevű mező minden „jó" szót kiirtana a szövegből.
    if (!value || value.length < 4) continue;
    out = out.replaceAll(value, " ");
    // Kisbetűs előfordulás is: a bejelentő nem feltétlenül úgy írja a szövegbe,
    // ahogy a mezőbe.
    const lower = value.toLowerCase();
    if (lower !== value) out = out.replaceAll(lower, " ");
  }

  out = out
    // E-mail.
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, " ")
    // Telefonszám: magyar formátumok (+36, 06, 20/30/70) és a szóköz/kötőjel/
    // perjel variációik. Szándékosan bőkezű: inkább vágjunk ki egy ártatlan
    // számsort, mint hogy kiadjunk egy telefonszámot.
    .replace(/(?:\+?36|0?6)[\s\-/(]*\d{1,2}[\s\-/)]*\d{3}[\s-]?\d{3,4}/g, " ")
    // Hosszú, szóközzel tagolt számsorok, amik nem illenek a fentire.
    .replace(/\b\d[\d\s\-/]{7,}\d\b/g, " ")
    // Házszám-szerű címtöredék („Fő utca 12.", „Kossuth u. 3/a").
    .replace(/\b[\p{Lu}][\p{L}]+\s+(?:utca|út|tér|köz|krt\.?|körút|u\.)\s*\d+[\w/.]*/giu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return out;
}

/** Ugyanaz egy kész poszton: minden mezőt átfésülünk, mielőtt visszaadnánk. */
function scrubPost(post: SocialPost, secrets: (string | null | undefined)[]): SocialPost {
  return {
    ...post,
    text:     scrubContact(post.text, secrets),
    short:    scrubContact(post.short, secrets),
    hashtags: post.hashtags.map((h) => scrubContact(h, secrets)).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Apró formázók
// ---------------------------------------------------------------------------

const SIZE_LABELS: Record<AnimalSize, string> = {
  SMALL:       "kis termetű",
  MEDIUM:      "közepes termetű",
  LARGE:       "nagy termetű",
  EXTRA_LARGE: "óriás termetű",
};

const GENDER_LABELS: Record<string, string> = {
  MALE:    "kan",
  FEMALE:  "szuka",
  UNKNOWN: "ismeretlen nemű",
};

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  LOST:  "Elveszett",
  FOUND: "Megtalált",
  STRAY: "Kóbor",
};

/** Hónapban tárolt kor emberi alakra. */
function ageLabel(months: number | null): string | null {
  if (months == null || months < 0) return null;
  if (months < 12) return `${months} hónapos`;
  const years = Math.floor(months / 12);
  return `${years} éves`;
}

/** Hashtagek normalizálása: `#` elöl, szóköz és ékezet nélkül. */
function toHashtag(raw: string): string {
  const clean = raw
    .replace(/^#/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "")
    .trim();
  return clean ? `#${clean}` : "";
}

function normalizeHashtags(list: string[], fallback: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...list, ...fallback]) {
    const t = toHashtag(tag);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= 10) break;
  }
  return out;
}

/**
 * Melyik meglévő képet ajánljuk?
 *
 * Az elsődlegest, különben a sorrend szerinti elsőt. A denormalizált
 * `imageUrl` a tartalék: a bejelentéseknél az a mező a biztos, a kapcsolódó
 * sorok pedig később kerültek a sémába.
 */
function pickImage(
  images: { url: string; isPrimary: boolean; order: number }[],
  fallbackUrl?: string | null,
): string | null {
  const primary = images.find((i) => i.isPrimary);
  if (primary) return primary.url;
  const sorted = [...images].sort((a, b) => a.order - b.order);
  return sorted[0]?.url ?? fallbackUrl ?? null;
}

/** A modell válaszának kibontása; bármi váratlannál `null`, hogy a sablon vegye át. */
function parsePost(raw: string): Omit<SocialPost, "imageUrl" | "url" | "generated"> | null {
  try {
    const parsed = JSON.parse(raw) as { text?: unknown; short?: unknown; hashtags?: unknown };
    if (typeof parsed.text !== "string" || typeof parsed.short !== "string") return null;
    const tags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.filter((t): t is string => typeof t === "string")
      : [];
    return { text: parsed.text, short: parsed.short, hashtags: tags };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Gazdikereső állat — személyiség-központú
// ---------------------------------------------------------------------------

const ANIMAL_SYSTEM =
  "Magyar állatmenhely közösségi médiás szövegírója vagy. Egy örökbefogadható állatról " +
  "írsz posztot.\n\n" +
  "A LEGFONTOSABB SZABÁLY: a poszt NEM adatlap. Az első mondat az állat SZEMÉLYISÉGÉRŐL " +
  "szóljon, egy konkrét, elképzelhető képpel, ami megmosolyogtat vagy megérint. " +
  "Rossz kezdés: „3 éves, ivartalanított kan, barátságos.” " +
  "Jó kezdés: „Bodri szerint a labdázás nem hobbi, hanem teljes munkaidős állás.”\n\n" +
  "A gyakorlati adatok (kor, méret, fajta, összefér-e gyerekkel/kutyával/macskával) " +
  "JÖHETNEK, de csak a személyes rész UTÁN, tömören.\n\n" +
  "Csak abból dolgozz, amit megadok. Ha valami nincs megadva, hagyd ki — ne találd ki. " +
  "Az állat nemét és korát ne írd át. Melegen, de nem cukrosan írj; kerüld a közhelyeket " +
  "(„örök hűség”, „négylábú kincs”). Ne ígérj olyat, amit a menhely nem tud tartani.\n\n" +
  "A `text` 3-6 mondat, Facebook-poszt hangvétellel. A `short` egy-két mondat Story-ra. " +
  "A `hashtags` 5-8 magyar hashtag, `#` nélkül is megadhatod.";

interface AnimalFacts {
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  size: string | null;
  gender: string | null;
  color: string | null;
  goodWith: string[];
  description: string | null;
  shelterName: string;
  city: string | null;
}

/** Amit a modell megkap — kifejezett felsorolás, nem a teljes rekord. */
function animalFactsText(f: AnimalFacts): string {
  const lines = [
    `Név: ${f.name}`,
    `Faj: ${f.species}`,
    f.breed  ? `Fajta: ${f.breed}` : null,
    f.age    ? `Kor: ${f.age}` : null,
    f.size   ? `Méret: ${f.size}` : null,
    f.gender ? `Nem: ${f.gender}` : null,
    f.color  ? `Szín: ${f.color}` : null,
    f.goodWith.length ? `Jól kijön: ${f.goodWith.join(", ")}` : null,
    f.description ? `A menhely leírása: ${f.description}` : null,
    `Menhely: ${f.shelterName}${f.city ? ` (${f.city})` : ""}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Tartalék sablon AI nélkül.
 *
 * Szikárabb, mint a generált szöveg, de HASZNÁLHATÓ: a menhely ki tudja
 * másolni és kézzel felturbózni. Szándékosan nem próbál személyiséget
 * imitálni — egy generált „vicces” mondat sablonból kínos lenne.
 */
function animalFallback(f: AnimalFacts): Omit<SocialPost, "imageUrl" | "url" | "generated"> {
  const traits = [f.age, f.size, f.breed].filter(Boolean).join(", ");
  const lines: string[] = [
    `${f.name} gazdit keres! 🐾`,
    traits ? `${traits}.` : null,
    f.description?.trim() || null,
    f.goodWith.length ? `Jól kijön: ${f.goodWith.join(", ")}.` : null,
    `Örökbefogadható a(z) ${f.shelterName} menhelyről.`,
  ].filter((l): l is string => !!l);

  return {
    text:  lines.join("\n\n"),
    short: `${f.name} gazdira vár${f.city ? ` – ${f.city}` : ""}. Nézd meg az adatlapját!`,
    hashtags: [],
  };
}

/**
 * Poszt egy örökbefogadható állatról.
 *
 * `null`, ha nincs ilyen állat. Minden más esetben ad valamit: hiba vagy
 * hiányzó kulcs esetén a sablont.
 */
export async function generateAnimalPost(animalId: string): Promise<SocialPost | null> {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: {
      name: true, slug: true, type: true, breed: true, age: true, size: true,
      gender: true, color: true, description: true,
      isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: true,
      images:  { select: { url: true, isPrimary: true, order: true } },
      shelter: { select: { name: true, city: true } },
    },
  });
  if (!animal) return null;

  const goodWith = [
    animal.isGoodWithKids ? "gyerekekkel" : null,
    animal.isGoodWithDogs ? "kutyákkal"   : null,
    animal.isGoodWithCats ? "macskákkal"  : null,
  ].filter((v): v is string => !!v);

  const facts: AnimalFacts = {
    name:    animal.name,
    species: ANIMAL_TYPE_LABELS[animal.type],
    breed:   animal.breed,
    age:     ageLabel(animal.age),
    size:    animal.size ? SIZE_LABELS[animal.size] : null,
    gender:  animal.gender ? (GENDER_LABELS[animal.gender] ?? null) : null,
    color:   animal.color,
    goodWith,
    description: animal.description,
    shelterName: animal.shelter.name,
    city:        animal.shelter.city,
  };

  const imageUrl = pickImage(animal.images);
  const url      = `${siteUrl()}/animals/${animal.slug}`;

  const fallbackTags = [
    "orokbefogadas", "menhely", "allatmenhely",
    facts.species, animal.name, animal.shelter.city ?? "",
  ];

  const anthropic = getClient();
  if (!anthropic) {
    const base = animalFallback(facts);
    return { ...base, hashtags: normalizeHashtags([], fallbackTags), imageUrl, url, generated: false };
  }

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: ANIMAL_SYSTEM,
      messages: [{
        role: "user",
        content: `Írj posztot erről az állatról:\n\n${animalFactsText(facts)}`,
      }],
      output_config: { format: { type: "json_schema", schema: POST_SCHEMA } },
    });

    const block = res.content.find((b) => b.type === "text");
    const parsed = block && block.type === "text" ? parsePost(block.text) : null;
    if (!parsed) throw new Error("A modell válasza nem értelmezhető");

    return {
      ...parsed,
      hashtags: normalizeHashtags(parsed.hashtags, fallbackTags),
      imageUrl,
      url,
      generated: true,
    };
  } catch (err) {
    // A poszt-generálás kényelmi funkció: ha elhasal, a menhely akkor is
    // kapjon valamit, amiből dolgozhat.
    console.error("generateAnimalPost error:", err);
    const base = animalFallback(facts);
    return { ...base, hashtags: normalizeHashtags([], fallbackTags), imageUrl, url, generated: false };
  }
}

// ---------------------------------------------------------------------------
// 2. Elveszett / talált bejelentés — tárgyilagos
// ---------------------------------------------------------------------------

const REPORT_SYSTEM =
  "Magyar állatmenhelyi rendszer vagy, amely elveszett és talált állatokról készít " +
  "megosztható közösségi posztot.\n\n" +
  "A HANGNEM TÁRGYILAGOS, PONTOS és SÜRGETŐ. Itt nincs humor, nincs kedélyeskedés és " +
  "nincs kötődésépítés: a posztot azért osztják meg, hogy az állat MEGKERÜLJÖN. " +
  "A szöveg legyen gyorsan átfutható.\n\n" +
  "KIZÁRÓLAG azt írhatod le, amit megadok. Semmilyen részletet nem találhatsz ki — " +
  "sem színt, sem helyet, sem időpontot, sem megkülönböztető jegyet. Ha egy adat " +
  "hiányzik, egyszerűen HAGYD KI; ne pótold, ne becsüld meg, ne írj helyette " +
  "általánosságot.\n\n" +
  "A helymegjelölés a VÁROS nevénél pontosabb nem lehet. Ne kérj és ne említs " +
  "telefonszámot, e-mail-címet, utcanevet vagy házszámot — a megosztott oldalon " +
  "megtalálják az elérhetőséget.\n\n" +
  "A `text` 3-5 rövid mondat vagy felsorolás. A `short` egy-két mondat Story-ra. " +
  "A `hashtags` 4-7 magyar hashtag.";

interface ReportFacts {
  typeLabel: string;
  species: string;
  animalName: string | null;
  breed: string | null;
  color: string | null;
  gender: string | null;
  city: string;
  reportedAt: string;
  description: string | null;
  /** A Claude Vision által a képből kinyert jegyek. */
  aiBreed: string | null;
  aiColors: string[];
  aiPattern: string | null;
  aiFeatures: string[];
}

function reportFactsText(f: ReportFacts): string {
  const lines = [
    `Bejelentés típusa: ${f.typeLabel}`,
    `Faj: ${f.species}`,
    f.animalName ? `Az állat neve: ${f.animalName}` : null,
    f.breed      ? `Fajta (bejelentő szerint): ${f.breed}` : null,
    f.color      ? `Szín (bejelentő szerint): ${f.color}` : null,
    f.gender     ? `Nem: ${f.gender}` : null,
    `Település: ${f.city}`,
    `Bejelentés ideje: ${f.reportedAt}`,
    f.description ? `A bejelentő leírása: ${f.description}` : null,
    // A képelemzés külön jelölve, hogy a modell lássa: ez gépi becslés, nem a
    // bejelentő állítása. Így nem keveri össze a kettőt a szövegben.
    f.aiBreed       ? `Képelemzés – becsült fajta: ${f.aiBreed}` : null,
    f.aiColors.length   ? `Képelemzés – színek: ${f.aiColors.join(", ")}` : null,
    f.aiPattern     ? `Képelemzés – mintázat: ${f.aiPattern}` : null,
    f.aiFeatures.length ? `Képelemzés – jegyek: ${f.aiFeatures.join(", ")}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Tartalék sablon AI nélkül.
 *
 * Csak a meglévő mezőket fűzi össze — ami hiányzik, az kimarad. Pont ez a
 * viselkedés kell a bejelentéseknél: a hiányzó adat helyére semmi nem kerül.
 */
function reportFallback(f: ReportFacts): Omit<SocialPost, "imageUrl" | "url" | "generated"> {
  const marks = [
    f.breed ?? f.aiBreed,
    f.color ?? (f.aiColors.length ? f.aiColors.join(", ") : null),
    f.aiPattern,
    f.gender,
  ].filter((v): v is string => !!v);

  const headline = `${f.typeLabel} ${f.species.toLowerCase()}${f.animalName ? ` – ${f.animalName}` : ""}`;

  const lines: string[] = [
    `${headline.toUpperCase()} · ${f.city}`,
    marks.length ? `Ismertetőjegyek: ${marks.join(", ")}.` : null,
    f.aiFeatures.length ? `További jegyek: ${f.aiFeatures.join(", ")}.` : null,
    f.description?.trim() || null,
    `Bejelentve: ${f.reportedAt}.`,
    "Ha láttad, nézd meg a bejelentés oldalát, és ott vedd fel a kapcsolatot.",
  ].filter((l): l is string => !!l);

  return {
    text:  lines.join("\n"),
    short: `${headline} – ${f.city}. Ha láttad, oszd meg!`,
    hashtags: [],
  };
}

/**
 * Poszt egy elveszett/talált/kóbor bejelentésről.
 *
 * `null`, ha nincs ilyen bejelentés. Minden más esetben ad valamit.
 */
export async function generateReportPost(reportId: string): Promise<SocialPost | null> {
  const report = await prisma.animalReport.findUnique({
    where: { id: reportId },
    // Kifejezett `select`, nem a teljes sor: a `contactName`, `contactPhone`,
    // `contactEmail`, `address`, `lat` és `lng` így BE SEM KERÜL abba az
    // objektumba, amiből a prompt épül. Amit nem kérünk le, azt nem is lehet
    // véletlenül továbbadni.
    select: {
      id: true, type: true, animalType: true, name: true, breed: true,
      color: true, gender: true, description: true, city: true,
      createdAt: true, imageUrl: true,
      aiBreed: true, aiColors: true, aiPattern: true, aiFeatures: true, aiSpecies: true,
      images: { select: { url: true, isPrimary: true, order: true } },
      // Csak a fésűhöz kell, a promptba nem megy: lásd `scrubContact`.
      contactName: true, contactPhone: true, contactEmail: true, address: true,
    },
  });
  if (!report) return null;

  /** Amit soha nem engedünk a kimenetbe – a rekord saját értékei. */
  const secrets = [
    report.contactName, report.contactPhone, report.contactEmail, report.address,
  ];

  const facts: ReportFacts = {
    typeLabel: REPORT_TYPE_LABELS[report.type],
    // Az `aiSpecies` a képből jön; ha van, az pontosabb lehet a bejelentő
    // választásánál, de a séma szerinti fajtípus a hiteles alap.
    species:   ANIMAL_TYPE_LABELS[report.animalType],
    animalName: report.name,
    breed:  report.breed,
    color:  report.color,
    gender: report.gender ? (GENDER_LABELS[report.gender] ?? null) : null,
    city:   report.city,
    reportedAt: report.createdAt.toLocaleDateString("hu-HU", {
      year: "numeric", month: "long", day: "numeric",
    }),
    // A bejelentő szabad szövege MÁR itt megfésülve megy a modellnek: ha
    // telefonszámot írt bele, a modell meg se lássa.
    description: report.description ? scrubContact(report.description, secrets) : null,
    aiBreed:    report.aiBreed,
    aiColors:   report.aiColors ?? [],
    aiPattern:  report.aiPattern,
    aiFeatures: report.aiFeatures ?? [],
  };

  const imageUrl = pickImage(report.images, report.imageUrl);
  const url      = `${siteUrl()}/reports/${report.id}`;

  const fallbackTags = [
    report.type === "LOST" ? "elveszettallat" : "talaltallat",
    "allatkereso", "segitsunk", facts.species, report.city,
  ];

  const finish = (
    base: Omit<SocialPost, "imageUrl" | "url" | "generated">,
    generated: boolean,
  ): SocialPost =>
    // A fésű a VISSZAADÁS előtt fut le, nem előtte: a modell a szabad szövegből
    // visszaidézhet olyat, amit mi már kivágtunk egyszer.
    scrubPost(
      {
        ...base,
        hashtags: normalizeHashtags(base.hashtags, fallbackTags),
        imageUrl,
        url,
        generated,
      },
      secrets,
    );

  const anthropic = getClient();
  if (!anthropic) return finish(reportFallback(facts), false);

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: REPORT_SYSTEM,
      messages: [{
        role: "user",
        content: `Írj megosztható posztot erről a bejelentésről:\n\n${reportFactsText(facts)}`,
      }],
      output_config: { format: { type: "json_schema", schema: POST_SCHEMA } },
    });

    const block = res.content.find((b) => b.type === "text");
    const parsed = block && block.type === "text" ? parsePost(block.text) : null;
    if (!parsed) throw new Error("A modell válasza nem értelmezhető");

    return finish(parsed, true);
  } catch (err) {
    console.error("generateReportPost error:", err);
    return finish(reportFallback(facts), false);
  }
}
