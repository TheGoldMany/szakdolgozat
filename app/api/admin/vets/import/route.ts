import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 500;

const bodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string())),
});

/** Elfogadott oszlopnevek (kisbetűsítve) mezőnként — magyar és angol fejléc is jó. */
const COLUMNS: Record<string, string[]> = {
  name:         ["name", "nev", "név"],
  address:      ["address", "cim", "cím"],
  city:         ["city", "varos", "város"],
  zipCode:      ["zipcode", "zip", "iranyitoszam", "irányítószám"],
  phone:        ["phone", "telefon"],
  email:        ["email", "e-mail"],
  website:      ["website", "weboldal"],
  openingHours: ["openinghours", "nyitvatartas", "nyitvatartás"],
  note:         ["note", "megjegyzes", "megjegyzés"],
  isEmergency:  ["isemergency", "ugyelet", "ügyelet"],
  lat:          ["lat"],
  lng:          ["lng", "lon", "long"],
};

const TRUTHY = new Set(["igen", "yes", "true", "1", "x", "y", "i"]);

/** A sor kulcsait levágja és kisbetűsíti, hogy a fejléc írásmódja ne számítson. */
function normalizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim().toLowerCase();
    if (out[key] === undefined || out[key] === "") out[key] = typeof v === "string" ? v.trim() : "";
  }
  return out;
}

function pick(row: Record<string, string>, field: string): string {
  for (const alias of COLUMNS[field]) {
    const value = row[alias];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function toBool(value: string): boolean {
  return TRUTHY.has(value.trim().toLowerCase());
}

/** Számmá alakítja a koordinátát (a tizedesvesszőt is elfogadva), ha érvényes. */
function toCoord(value: string, max: number): number | null {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n < -max || n > max) return null;
  return n;
}

function cut(value: string, max: number): string | null {
  const v = value.trim();
  if (!v) return null;
  return v.slice(0, max);
}

// POST /api/admin/vets/import – CSV-ből beolvasott sorok tömeges importja (super admin)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
    }

    const rows = parsed.data.rows;
    if (rows.length === 0) {
      return NextResponse.json({ error: "A fájl nem tartalmaz importálható sort." }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Egyszerre legfeljebb ${MAX_ROWS} sor importálható (a fájl ${rows.length} sort tartalmaz). Bontsd kisebb részekre.` },
        { status: 400 },
      );
    }

    // A már meglévő aktív rendelők név+város kulcsa (kisbetűsen) – duplikátum szűréshez
    const existing = await prisma.vetClinic.findMany({
      where:  { isActive: true },
      select: { name: true, city: true },
    });
    const seen = new Set(existing.map((v) => `${v.name.trim().toLowerCase()}|${v.city.trim().toLowerCase()}`));

    let created = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      // 1 = fejléc sor, ezért a CSV-beli sorszám az index + 2
      const rowNumber = i + 2;
      const row = normalizeRow(rows[i]);

      const name    = pick(row, "name");
      const address = pick(row, "address");
      const city    = pick(row, "city");

      const missing: string[] = [];
      if (!name)    missing.push("név");
      if (!address) missing.push("cím");
      if (!city)    missing.push("város");

      if (missing.length > 0) {
        skipped++;
        errors.push({ row: rowNumber, reason: `Hiányzó kötelező mező: ${missing.join(", ")}.` });
        continue;
      }

      const key = `${name.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
      if (seen.has(key)) {
        duplicates++;
        continue;
      }

      // Import közben szándékosan NEM geokódolunk (lassú és rate limitbe ütközne):
      // csak a fájlban megadott koordinátát vesszük át, ha mindkettő érvényes.
      const lat = toCoord(pick(row, "lat"), 90);
      const lng = toCoord(pick(row, "lng"), 180);
      const hasCoords = lat != null && lng != null;

      try {
        await prisma.vetClinic.create({
          data: {
            name:         name.slice(0, 200),
            address:      address.slice(0, 200),
            city:         city.slice(0, 100),
            zipCode:      cut(pick(row, "zipCode"), 20),
            phone:        cut(pick(row, "phone"), 40),
            email:        cut(pick(row, "email"), 200),
            website:      cut(pick(row, "website"), 300),
            openingHours: cut(pick(row, "openingHours"), 500),
            note:         cut(pick(row, "note"), 1000),
            isEmergency:  toBool(pick(row, "isEmergency")),
            lat:          hasCoords ? lat : null,
            lng:          hasCoords ? lng : null,
          },
        });
        created++;
        seen.add(key);
      } catch (rowError) {
        console.error("[api/admin/vets/import] sor mentése sikertelen", rowNumber, rowError);
        skipped++;
        errors.push({ row: rowNumber, reason: "A sor mentése nem sikerült." });
      }
    }

    return NextResponse.json({ created, skipped, duplicates, errors });
  } catch (error) {
    console.error("[api/admin/vets/import]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
