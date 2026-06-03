import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback");

export interface MobileUser { id: string; role: string }

export async function getMobileUser(req: NextRequest): Promise<MobileUser | null> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub  = payload.sub;
    const role = (payload.role as string) ?? "USER";
    if (!sub) return null;
    return { id: sub, role };
  } catch {
    return null;
  }
}
