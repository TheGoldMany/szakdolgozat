import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { calendarMonth } from "@/lib/daily-posts";

/**
 * GET /api/daily-posts/calendar?year=&month=
 *
 * A SAJÁT korábbi képek egy hónapra. Szándékosan nincs `userId` paraméter: a
 * lejárt képek visszanézése csak a szerzőnek szól, más profiljába nem lehet
 * belelátni vele.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  const now   = new Date();
  const year  = Number(req.nextUrl.searchParams.get("year"))  || now.getFullYear();
  const month = Number(req.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    return NextResponse.json({ error: "Érvénytelen hónap" }, { status: 400 });
  }

  return NextResponse.json({ days: await calendarMonth(user!.id, year, month), year, month });
}
