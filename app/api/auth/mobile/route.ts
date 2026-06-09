import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback");
const EXPIRES_IN = 30 * 24 * 60 * 60; // 30 nap másodpercben

// POST /api/auth/mobile  – mobilapp JWT bejelentkezés
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where:  { email: String(email).toLowerCase() },
    select: { id: true, name: true, email: true, password: true, role: true, emailVerified: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "Hibás e-mail vagy jelszó" }, { status: 401 });
  }

  const valid = await compare(String(password), user.password);
  if (!valid) {
    return NextResponse.json({ error: "Hibás e-mail vagy jelszó" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  const token = await new SignJWT({ sub: user.id, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(secret);

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
