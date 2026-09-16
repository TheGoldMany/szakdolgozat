import { NextResponse } from "next/server";
import { publicShelter } from "@/lib/public-shapes";

/**
 * GET /api/shelters/[id] — egy menhely publikus adatai.
 *
 * Ez a végpont sem létezett, pedig a mobil `getShelter()` hívja. Az azonosító
 * lehet cuid vagy slug.
 *
 * Inaktív menhelyet nem ad ki: az a listából is kimarad, tehát ha itt
 * kiadnánk, a közvetlen hivatkozás megkerülné a szűrést.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const shelter = await publicShelter(params.id);
    if (!shelter) {
      return NextResponse.json({ error: "A menhely nem található" }, { status: 404 });
    }
    return NextResponse.json(shelter);
  } catch (error) {
    console.error("[api/shelters/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
