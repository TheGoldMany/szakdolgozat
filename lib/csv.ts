/**
 * Függőség nélküli CSV feldolgozó.
 *
 * Támogatja:
 *  - idézőjelbe tett mezőket, amelyekben elválasztó, sortörés is lehet
 *  - escape-elt idézőjelet ("")
 *  - CRLF és LF sorvégeket
 *  - UTF-8 BOM-ot
 *  - automatikus elválasztó felismerést (","  vagy ";") — a magyar Excel ";"-t exportál
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/** A fejléc sor alapján megállapítja az elválasztó karaktert (vessző vagy pontosvessző). */
export function detectDelimiter(text: string): "," | ";" {
  // Csak az első (fejléc) sort nézzük — idézőjelen belüli előfordulásokat kihagyva.
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "\n" || ch === "\r") break;
    if (ch === ",") commas++;
    else if (ch === ";") semicolons++;
  }

  return semicolons > commas ? ";" : ",";
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Nyers mezőmátrixszá alakítja a szöveget. */
function toMatrix(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') { inQuotes = true; i++; continue; }

    if (ch === delimiter) { pushField(); i++; continue; }

    if (ch === "\r") {
      // CRLF vagy magányos CR
      pushField();
      pushRow();
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }

    if (ch === "\n") { pushField(); pushRow(); i++; continue; }

    field += ch;
    i++;
  }

  // Utolsó mező / sor lezárása
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  return rows;
}

/** Igaz, ha a sor minden mezője üres (a záró üres sorokat így szűrjük ki). */
function isEmptyRow(cells: string[]): boolean {
  return cells.every((c) => c.trim() === "");
}

/**
 * CSV szöveg feldolgozása.
 * A fejléceket levágja (trim) és kisbetűssé alakítja, hogy az oszlopok
 * egyszerűen párosíthatók legyenek; a sorok kulcsai is ezek a nevek.
 */
export function parseCsv(text: string): ParsedCsv {
  const clean = stripBom(text ?? "");
  if (clean.trim() === "") return { headers: [], rows: [] };

  const delimiter = detectDelimiter(clean);
  const matrix = toMatrix(clean, delimiter).filter((r) => !isEmptyRow(r));
  if (matrix.length === 0) return { headers: [], rows: [] };

  const rawHeaders = matrix[0];
  const headers: string[] = [];
  const seen = new Map<string, number>();

  for (const raw of rawHeaders) {
    const base = raw.trim().toLowerCase();
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    // Ismétlődő fejlécnév esetén sorszámozunk, hogy ne vesszen el oszlop
    headers.push(count === 0 ? base : `${base}_${count + 1}`);
  }

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] ?? "").trim(); });
    rows.push(obj);
  }

  return { headers, rows };
}
