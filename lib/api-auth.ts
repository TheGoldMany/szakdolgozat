import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getMobileUser } from "@/lib/mobile-auth";
import { isUserSuspended } from "@/lib/account-status";

export interface AuthUser {
  id:   string;
  role: string;
}

/**
 * Egységes azonosítás API-végpontokhoz: előbb a böngésző NextAuth session-jét
 * nézi, majd a mobilapp `Authorization: Bearer <jwt>` fejlécét.
 * Így ugyanaz a végpont kiszolgálja a webet és a mobilalkalmazást is.
 *
 * @returns a bejelentkezett felhasználó, vagy `null` ha egyik sem érvényes
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { id: session.user.id, role: (session.user as { role?: string }).role ?? "USER" };
  }
  return getMobileUser(req);
}

export interface RequireAuthResult {
  user?:  AuthUser;
  error?: NextResponse;
}

/**
 * Mint a `getAuthUser`, de kész hibaválaszt ad vissza, ha nincs bejelentkezve
 * (401) vagy a fiók fel van függesztve (403). Írási végpontokhoz:
 *
 * ```ts
 * const { user, error } = await requireAuthUser(req);
 * if (error) return error;
 * // innentől user.id / user.role használható
 * ```
 *
 * @param opts.allowSuspended csak akkor `true`, ha a művelet felfüggesztett
 *   fióknak is megengedett (pl. kizárólag olvasás)
 */
export async function requireAuthUser(
  req: NextRequest,
  opts: { allowSuspended?: boolean } = {},
): Promise<RequireAuthResult> {
  const user = await getAuthUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 }) };
  }

  if (!opts.allowSuspended && (await isUserSuspended(user.id))) {
    return {
      error: NextResponse.json(
        { error: "A fiókod fel van függesztve, ezért ez a művelet nem érhető el. Vedd fel a kapcsolatot az üzemeltetővel." },
        { status: 403 },
      ),
    };
  }

  return { user };
}
