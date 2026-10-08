import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Közösségi poszt-generátor.
 *
 * A védendő pontok:
 *
 * • ADATVÉDELEM. A kapcsolati adatok (név, telefon, e-mail, cím) SOHA nem
 *   kerülhetnek a generált szövegbe. Két támadási felület van: a tiltott
 *   mezők maguk, és a `description`, amit a BEJELENTŐ ír — abba simán
 *   belekerül telefonszám. Mindkettőre külön teszt van.
 *
 * • AI NÉLKÜL IS MŰKÖDJÖN. Kulcs nélkül nem hibát kell dobni, hanem
 *   használható sablont adni.
 *
 * • A BEJELENTÉS SABLONJA NEM TALÁL KI SEMMIT. Ami hiányzik, az kimarad —
 *   nem kerül a helyére „ismeretlen" vagy becslés.
 */

const createMessage = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: createMessage };
  },
}));

const animalFindUnique = vi.fn();
const reportFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    animal:       { findUnique: animalFindUnique },
    animalReport: { findUnique: reportFindUnique },
  },
}));

const { generateAnimalPost, generateReportPost, isSocialPostEnabled } =
  await import("@/lib/social-post");

/** A modell válasza úgy, ahogy az SDK adja. */
function modelReply(post: { text: string; short: string; hashtags: string[] }) {
  return { content: [{ type: "text", text: JSON.stringify(post) }] };
}

const TELEFON = "+36 30 123 4567";
const EMAIL   = "kiss.peter@example.com";
const CIM     = "Kossuth utca 12.";
const NEV     = "Kiss Péter";

function reportRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "rep1",
    type: "LOST",
    animalType: "DOG",
    name: "Bodri",
    breed: "keverék",
    color: "barna",
    gender: "MALE",
    description: "Barna keverék kutya, piros nyakörvvel.",
    city: "Szeged",
    createdAt: new Date("2026-03-04T10:00:00Z"),
    imageUrl: null,
    aiBreed: null, aiColors: [], aiPattern: null, aiFeatures: [], aiSpecies: null,
    images: [],
    contactName: NEV, contactPhone: TELEFON, contactEmail: EMAIL, address: CIM,
    ...overrides,
  };
}

function animalRow(overrides: Record<string, unknown> = {}) {
  return {
    name: "Bodri", slug: "bodri-1", type: "DOG", breed: "keverék",
    age: 36, size: "MEDIUM", gender: "MALE", color: "barna",
    description: "Játékos, emberbarát kutya.",
    isGoodWithKids: true, isGoodWithDogs: true, isGoodWithCats: false,
    images: [],
    shelter: { name: "Mancs Menhely", city: "Szeged" },
    ...overrides,
  };
}

beforeEach(() => {
  createMessage.mockReset();
  animalFindUnique.mockReset();
  reportFindUnique.mockReset();
  delete process.env.ANTHROPIC_API_KEY;
});

describe("AI nélküli működés", () => {
  it("kulcs nélkül nem dob, hanem sablont ad", async () => {
    reportFindUnique.mockResolvedValue(reportRow());
    const post = await generateReportPost("rep1");

    expect(post).not.toBeNull();
    expect(post!.generated).toBe(false);
    expect(post!.text.length).toBeGreaterThan(0);
    expect(post!.short.length).toBeGreaterThan(0);
    // A modellt meg sem hívtuk.
    expect(createMessage).not.toHaveBeenCalled();
    expect(isSocialPostEnabled()).toBe(false);
  });

  it("a modell hibája is a sablonra esik vissza, nem dob", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-teszt";
    animalFindUnique.mockResolvedValue(animalRow());
    createMessage.mockRejectedValue(new Error("rate limit"));

    const post = await generateAnimalPost("a1");
    expect(post!.generated).toBe(false);
    expect(post!.text).toContain("Bodri");
  });

  it("nem létező rekordra null", async () => {
    animalFindUnique.mockResolvedValue(null);
    reportFindUnique.mockResolvedValue(null);
    expect(await generateAnimalPost("nincs")).toBeNull();
    expect(await generateReportPost("nincs")).toBeNull();
  });
});

describe("adatvédelem", () => {
  function assertClean(text: string) {
    expect(text).not.toContain(TELEFON);
    expect(text).not.toContain("06 30 123 4567");
    expect(text).not.toContain("3012345");
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain(NEV);
    expect(text).not.toContain(CIM);
  }

  it("a kapcsolati mezők nem kerülnek a sablonba", async () => {
    reportFindUnique.mockResolvedValue(reportRow());
    const post = await generateReportPost("rep1");
    assertClean(`${post!.text} ${post!.short} ${post!.hashtags.join(" ")}`);
  });

  it("a BEJELENTŐ által a leírásba írt telefonszámot is kivágja", async () => {
    // Ez a nehezebb eset: az adat nem a tiltott mezőben van, hanem a
    // megengedett szabad szövegben. Az engedélyezőlista erre nem véd.
    reportFindUnique.mockResolvedValue(reportRow({
      description: `Barna kutya. Ha megvan, hívj: ${TELEFON} vagy írj: ${EMAIL}. Lakcím: ${CIM}`,
    }));
    const post = await generateReportPost("rep1");
    assertClean(post!.text);
    // A hasznos tartalom viszont megmarad.
    expect(post!.text).toContain("Barna kutya");
  });

  it("a modell által visszaidézett kapcsolati adatot is kivágja", async () => {
    // A modell a promptból vagy a saját fantáziájából is leírhat ilyesmit;
    // a kimenetet ezért a visszaadás ELŐTT is átfésüljük.
    process.env.ANTHROPIC_API_KEY = "sk-teszt";
    reportFindUnique.mockResolvedValue(reportRow());
    createMessage.mockResolvedValue(modelReply({
      text:  `Elveszett kutya Szegeden. Hívd ${NEV}-t a ${TELEFON} számon!`,
      short: `Írj ide: ${EMAIL}`,
      hashtags: ["elveszettallat"],
    }));

    const post = await generateReportPost("rep1");
    assertClean(`${post!.text} ${post!.short}`);
    expect(post!.text).toContain("Szeged");
  });

  it("a tiltott mezőket a promptba sem adjuk át", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-teszt";
    reportFindUnique.mockResolvedValue(reportRow());
    createMessage.mockResolvedValue(modelReply({ text: "x", short: "y", hashtags: [] }));

    await generateReportPost("rep1");

    const sent = JSON.stringify(createMessage.mock.calls[0][0]);
    assertClean(sent);
    // A város viszont igen: a poszt a városig mehet el.
    expect(sent).toContain("Szeged");
  });

  it("a rövid mezőértékek nem irtják ki a szöveget", async () => {
    // Egy 1-3 karakteres kapcsolati érték szó szerinti kivágása ártatlan
    // szavakat is eltüntetne, ezért azokat nem vágjuk.
    reportFindUnique.mockResolvedValue(reportRow({
      contactName: "Jó", description: "Jól táplált, jó természetű kutya.",
    }));
    const post = await generateReportPost("rep1");
    expect(post!.text).toContain("jó természetű");
  });
});

describe("bejelentés hangneme és adatkezelése", () => {
  it("a hiányzó adatot kihagyja, nem pótolja", async () => {
    reportFindUnique.mockResolvedValue(reportRow({
      name: null, breed: null, color: null, gender: null, description: null,
    }));
    const post = await generateReportPost("rep1");

    // Semmilyen kitalált tölteléket nem írunk a hiányzó mezők helyére.
    expect(post!.text).not.toMatch(/ismeretlen|nincs megadva|feltehetően|valószínűleg/i);
    // Ami megvan, az viszont ott van.
    expect(post!.text).toContain("Szeged");
  });

  it("a képelemzés jegyeit is felhasználja", async () => {
    reportFindUnique.mockResolvedValue(reportRow({
      breed: null, color: null,
      aiBreed: "beagle", aiColors: ["fehér", "barna"],
      aiPattern: "foltos", aiFeatures: ["bal fülén bevágás"],
    }));
    const post = await generateReportPost("rep1");

    expect(post!.text).toContain("beagle");
    expect(post!.text).toContain("foltos");
    expect(post!.text).toContain("bal fülén bevágás");
  });

  it("a bejelentés típusa és a város a főszövegben van", async () => {
    reportFindUnique.mockResolvedValue(reportRow({ type: "FOUND" }));
    const post = await generateReportPost("rep1");
    expect(post!.text.toLowerCase()).toContain("megtalált");
    expect(post!.text).toContain("Szeged");
  });
});

describe("gazdikereső állat", () => {
  it("a sablon a nevet és a gyakorlati adatokat hozza", async () => {
    animalFindUnique.mockResolvedValue(animalRow());
    const post = await generateAnimalPost("a1");

    expect(post!.text).toContain("Bodri");
    expect(post!.text).toContain("3 éves");
    expect(post!.text).toContain("Mancs Menhely");
    expect(post!.text).toContain("gyerekekkel");
    // A macskákkal NEM jön ki – ezt nem állíthatjuk.
    expect(post!.text).not.toContain("macskákkal");
  });

  it("a 12 hónap alatti kort hónapban írja", async () => {
    animalFindUnique.mockResolvedValue(animalRow({ age: 8 }));
    const post = await generateAnimalPost("a1");
    expect(post!.text).toContain("8 hónapos");
  });

  it("a modell szövegét adja vissza, ha van kulcs", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-teszt";
    animalFindUnique.mockResolvedValue(animalRow());
    createMessage.mockResolvedValue(modelReply({
      text:  "Bodri szerint a labdázás teljes munkaidős állás.",
      short: "Bodri gazdit keres.",
      hashtags: ["orokbefogadas"],
    }));

    const post = await generateAnimalPost("a1");
    expect(post!.generated).toBe(true);
    expect(post!.text).toContain("teljes munkaidős állás");
  });
});

describe("képválasztás", () => {
  it("az elsődleges képet ajánlja", async () => {
    animalFindUnique.mockResolvedValue(animalRow({
      images: [
        { url: "https://x/2.jpg", isPrimary: false, order: 0 },
        { url: "https://x/1.jpg", isPrimary: true,  order: 5 },
      ],
    }));
    const post = await generateAnimalPost("a1");
    expect(post!.imageUrl).toBe("https://x/1.jpg");
  });

  it("elsődleges nélkül a sorrend szerinti elsőt", async () => {
    animalFindUnique.mockResolvedValue(animalRow({
      images: [
        { url: "https://x/b.jpg", isPrimary: false, order: 3 },
        { url: "https://x/a.jpg", isPrimary: false, order: 1 },
      ],
    }));
    const post = await generateAnimalPost("a1");
    expect(post!.imageUrl).toBe("https://x/a.jpg");
  });

  it("bejelentésnél a denormalizált mező a tartalék", async () => {
    // A `ReportImage` sorok később kerültek a sémába; a régi bejelentéseknél
    // csak az `imageUrl` mező van kitöltve.
    reportFindUnique.mockResolvedValue(reportRow({
      images: [], imageUrl: "https://x/regi.jpg",
    }));
    const post = await generateReportPost("rep1");
    expect(post!.imageUrl).toBe("https://x/regi.jpg");
  });

  it("kép nélkül null, nem üres szöveg", async () => {
    animalFindUnique.mockResolvedValue(animalRow({ images: [] }));
    const post = await generateAnimalPost("a1");
    expect(post!.imageUrl).toBeNull();
  });
});

describe("hashtagek", () => {
  it("ékezet nélkül, `#`-kel, duplikátum nélkül", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-teszt";
    animalFindUnique.mockResolvedValue(animalRow());
    createMessage.mockResolvedValue(modelReply({
      text: "x", short: "y",
      hashtags: ["#örökbefogadás", "örökbefogadás", "menhely kutya"],
    }));

    const post = await generateAnimalPost("a1");
    expect(post!.hashtags).toContain("#orokbefogadas");
    expect(post!.hashtags).toContain("#menhelykutya");
    // A duplikátum csak egyszer.
    expect(post!.hashtags.filter((h) => h === "#orokbefogadas")).toHaveLength(1);
    // Mind `#`-kel kezdődik, és nincs bennük szóköz.
    for (const h of post!.hashtags) {
      expect(h.startsWith("#")).toBe(true);
      expect(h).not.toMatch(/\s/);
    }
  });

  it("sablonnál is kapunk hashtageket az adatokból", async () => {
    reportFindUnique.mockResolvedValue(reportRow());
    const post = await generateReportPost("rep1");
    expect(post!.hashtags.length).toBeGreaterThan(0);
    expect(post!.hashtags).toContain("#elveszettallat");
  });
});

describe("a poszt URL-je", () => {
  it("az állat adatlapjára mutat slug szerint", async () => {
    animalFindUnique.mockResolvedValue(animalRow());
    const post = await generateAnimalPost("a1");
    expect(post!.url).toMatch(/\/animals\/bodri-1$/);
  });

  it("a bejelentés oldalára mutat azonosító szerint", async () => {
    reportFindUnique.mockResolvedValue(reportRow());
    const post = await generateReportPost("rep1");
    expect(post!.url).toMatch(/\/reports\/rep1$/);
  });
});
