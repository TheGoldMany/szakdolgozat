import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ACTING_SHELTER_COOKIE } from "@/lib/acting-shelter";

/**
 * POST /api/admin/acting-shelter
 *
 * Beállítja, hogy a super admin melyik menhely nevében dolgozzon.
 * Üres `shelterId` = minden menhely (a választás törlése).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const { shelterId } = await req.json().catch(() => ({ shelterId: null }));

  const res = NextResponse.json({ ok: true });
  if (shelterId) {
    res.cookies.set(ACTING_SHELTER_COOKIE, String(shelterId), {
      httpOnly: true,
      sameSite: "lax",
      path:     "/",
      maxAge:   60 * 60 * 24 * 30, // 30 nap
    });
  } else {
    res.cookies.delete(ACTING_SHELTER_COOKIE);
  }
  return res;
}
