import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { MIN_QUERY_LENGTH, searchUsers } from "@/lib/user-search";
import { connectionPairKey } from "@/lib/connections";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search?q=...
 *
 * Bejelentkezés kell hozzá: a névsor ne legyen kívülről lekérdezhető. A
 * találatok mellé megy a kapcsolat állapota is, hogy a lista egyből a helyes
 * gombot tudja kirakni, és ne kelljen minden találatra külön kérdezni.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  // A keresés olvasás, de gépi végigpörgetést ne engedjünk.
  if (!checkRateLimit(`user-search:${getClientIp(req)}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Túl sok keresés. Próbáld újra egy perc múlva." },
      { status: 429 },
    );
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ results: [], tooShort: true });
  }

  const hits = await searchUsers(q, user!.id);
  if (hits.length === 0) return NextResponse.json({ results: [] });

  // Egy kérdésben kérjük le az összes érintett kapcsolatot, nem találatonként.
  const rows = await prisma.userConnection.findMany({
    where:  { pairKey: { in: hits.map((h) => connectionPairKey(user!.id, h.id)) } },
    select: { id: true, pairKey: true, status: true, requesterId: true },
  });
  const byPair = new Map(rows.map((r) => [r.pairKey, r]));

  const results = hits.map((hit) => {
    const row = byPair.get(connectionPairKey(user!.id, hit.id));
    const state = !row
      ? "none"
      : row.status === "ACCEPTED" ? "connected"
      : row.status === "DECLINED" ? "declined"
      : row.requesterId === user!.id ? "outgoing" : "incoming";
    return { ...hit, connection: { state, id: row?.id ?? null } };
  });

  return NextResponse.json({ results });
}
