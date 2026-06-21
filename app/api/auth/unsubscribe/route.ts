import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function expectedToken(email: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "secret")
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

// GET /api/auth/unsubscribe?email=...&token=...
// Stateless HMAC-verified one-click unsubscribe (RFC 8058 compatible link)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  if (!email || !token || token !== expectedToken(email)) {
    return NextResponse.redirect(`${BASE}/auth/unsubscribed?status=invalid`);
  }

  try {
    await prisma.user.updateMany({
      where: { email: email.toLowerCase() },
      data:  { emailNotifications: false },
    });
  } catch {
    return NextResponse.redirect(`${BASE}/auth/unsubscribed?status=error`);
  }

  return NextResponse.redirect(`${BASE}/auth/unsubscribed?status=ok`);
}
