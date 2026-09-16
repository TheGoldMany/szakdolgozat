import { NextResponse } from "next/server";
import { publicShelters } from "@/lib/public-shapes";

/**
 * GET /api/shelters — aktív menhelyek publikus listája.
 *
 * Ez a végpont eddig NEM létezett: csak a `/api/shelters/list` volt meg, ami
 * viszont kizárólag `{ id, name }` párokat ad vissza legördülő listákhoz. A
 * mobilapp menhely-füle a teljes alakot kéri (város, telefon, koordináták), és
 * 404-et kapott — a hibát pedig egy néma `catch` elnyelte, tehát a felhasználó
 * üres listát látott.
 *
 * Szándékosan nincs lapozás: a menhelyek száma nagyságrendekkel kisebb, mint az
 * állatoké, a kliens pedig térképen és listában is egyszerre akarja mutatni
 * őket. A felső korlát így is ott van, hogy ne lehessen vég nélkül növelni.
 */
export async function GET() {
  try {
    return NextResponse.json(await publicShelters());
  } catch (error) {
    console.error("[api/shelters GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
