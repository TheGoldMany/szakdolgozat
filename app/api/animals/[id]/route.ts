import { NextResponse } from "next/server";
import { publicAnimal } from "@/lib/public-shapes";

/**
 * GET /api/animals/[id] — egy állat adatlapja.
 *
 * Ez a végpont eddig NEM létezett: az `[id]` könyvtár alatt tucatnyi alútvonal
 * volt (health, behavior, documents…), de magán az `[id]` szinten semmi. A
 * mobilapp állat-részletező képernyője ezt hívja, tehát 404-et kapott, és mivel
 * ott nem volt hibakezelés, üres képernyőt mutatott magyarázat nélkül.
 *
 * Publikus, mint a lista-végpont és a webes adatlap: bejelentkezés nélkül is
 * elérhető. Az azonosító lehet cuid vagy slug — a mobil id-t ad át, a web
 * slugot használ.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const animal = await publicAnimal(params.id);
    if (!animal) {
      return NextResponse.json({ error: "Az állat nem található" }, { status: 404 });
    }
    return NextResponse.json(animal);
  } catch (error) {
    console.error("[api/animals/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
