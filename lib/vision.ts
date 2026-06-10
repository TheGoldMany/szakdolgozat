/**
 * Claude Vision integráció a kép-alapú elveszett-talált párosításhoz.
 *
 * Két funkció:
 *  - analyzeReportImage(): egyetlen képből strukturált leírót készít, amit
 *    tárolunk az AnimalReport rekordon (gyors előszűréshez).
 *  - compareReports(): két bejelentést (kép + adatok) páronként összehasonlít,
 *    és emberi nyelvű, magyarázható eredményt ad vissza.
 *
 * Ha az ANTHROPIC_API_KEY nincs beállítva, a függvények null-t adnak vissza,
 * és a párosítás a strukturált attribútumokra (szín, méret, hely, idő) esik vissza.
 */
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export function isVisionEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// ---------------------------------------------------------------------------
// 1. Egy kép elemzése → strukturált leíró
// ---------------------------------------------------------------------------
export interface AnimalDescriptor {
  species: string; // pl. "kutya", "macska"
  breed: string | null; // becsült fajta
  colors: string[]; // domináns színek, magyarul
  pattern: string | null; // mintázat (pl. "cirmos", "foltos")
  size: string | null; // "kicsi" | "közepes" | "nagy"
  features: string[]; // megkülönböztető jegyek
  hasCollar: boolean | null;
  summary: string; // 1-2 mondatos összefoglaló magyarul
}

const DESCRIPTOR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    species: { type: "string" },
    breed: { type: ["string", "null"] },
    colors: { type: "array", items: { type: "string" } },
    pattern: { type: ["string", "null"] },
    size: { type: ["string", "null"] },
    features: { type: "array", items: { type: "string" } },
    hasCollar: { type: ["boolean", "null"] },
    summary: { type: "string" },
  },
  required: [
    "species",
    "breed",
    "colors",
    "pattern",
    "size",
    "features",
    "hasCollar",
    "summary",
  ],
} as const;

/**
 * Elemez egy állatképet Claude Vision-nel, és strukturált leírót ad vissza.
 * Hibatűrő: ha nincs API kulcs vagy az elemzés meghiúsul, null-t ad vissza.
 */
export async function analyzeReportImage(
  imageUrl: string
): Promise<AnimalDescriptor | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "Állatmenhelyi rendszer vagy, amely elveszett és megtalált állatokat segít párosítani. " +
        "Egy állatról készült fényképet kapsz. Elemezd objektíven, és add vissza a látható " +
        "jellemzőket strukturált formában. Magyarul írj. Csak azt írd le, ami a képen valóban látszik; " +
        "ne találgass bizonytalan részleteket.",
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            {
              type: "text",
              text: "Írd le ezt az állatot a párosításhoz: faj, becsült fajta, domináns színek, " +
                "mintázat, méret, megkülönböztető jegyek (pl. fülforma, farok, sérülés, jelölés), " +
                "van-e rajta nyakörv, és egy rövid összefoglaló.",
            },
          ],
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: DESCRIPTOR_SCHEMA },
      },
    });

    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    return JSON.parse(block.text) as AnimalDescriptor;
  } catch (err) {
    console.error("analyzeReportImage error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Két bejelentés páronkénti összehasonlítása → magyarázható eredmény
// ---------------------------------------------------------------------------
export interface PairwiseComparison {
  verdict: "LIKELY" | "POSSIBLE" | "UNLIKELY";
  /** 0..1 vizuális/leíró hasonlóság */
  visualScore: number;
  /** Emberi nyelvű, pontokba szedett indoklás (magyar). */
  reasons: string[];
}

const COMPARISON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["LIKELY", "POSSIBLE", "UNLIKELY"] },
    visualScore: { type: "number" },
    reasons: { type: "array", items: { type: "string" } },
  },
  required: ["verdict", "visualScore", "reasons"],
} as const;

export interface ComparisonInput {
  /** "elveszett" oldal leírása */
  label: string; // pl. "Elveszett" / "Megtalált"
  imageUrl: string;
  breed?: string | null;
  color?: string | null;
  description?: string | null;
}

/**
 * Összehasonlít két állatképet (mindkettőhöz tartozik fotó). A modell
 * megmondja, mennyire valószínű, hogy ugyanaz az állat, és MIÉRT –
 * a felhasználónak hasznos, magyarázható indoklással.
 */
export async function compareReports(
  a: ComparisonInput,
  b: ComparisonInput
): Promise<PairwiseComparison | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const meta = (i: ComparisonInput) =>
    [
      i.breed ? `fajta: ${i.breed}` : null,
      i.color ? `szín: ${i.color}` : null,
      i.description ? `leírás: ${i.description}` : null,
    ]
      .filter(Boolean)
      .join("; ") || "nincs megadva";

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "Állatmenhelyi rendszer vagy, amely elveszett és megtalált állatok fotóit hasonlítja össze. " +
        "Két fotót és a hozzájuk tartozó adatokat kapod. Döntsd el, mennyire valószínű, hogy " +
        "UGYANARRÓL az állatról van szó. Légy óvatos: a fajta- és szín-egyezés önmagában nem elég, " +
        "keress egyedi, megkülönböztető jegyeket. A 'reasons' mezőbe rövid, közérthető magyar " +
        "mondatokat írj (mindegyik egy önálló érv mellette vagy ellene), amelyeket a felhasználónak " +
        "mutatunk meg. A visualScore 0 és 1 közötti szám.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `1. fotó (${a.label}) – ${meta(a)}:` },
            { type: "image", source: { type: "url", url: a.imageUrl } },
            { type: "text", text: `2. fotó (${b.label}) – ${meta(b)}:` },
            { type: "image", source: { type: "url", url: b.imageUrl } },
            {
              type: "text",
              text: "Ugyanaz az állat lehet a két képen? Indokold, és add meg a verdiktet.",
            },
          ],
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: COMPARISON_SCHEMA },
      },
    });

    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const parsed = JSON.parse(block.text) as PairwiseComparison;
    // védőkorlát a pontszámra
    parsed.visualScore = Math.max(0, Math.min(1, parsed.visualScore ?? 0));
    return parsed;
  } catch (err) {
    console.error("compareReports error:", err);
    return null;
  }
}
