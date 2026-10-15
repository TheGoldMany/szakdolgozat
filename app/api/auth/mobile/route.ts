import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { jwtSecretKey } from "@/lib/secrets";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
const EXPIRES_IN = 30 * 24 * 60 * 60; // 30 nap másodpercben

// POST /api/auth/mobile  – mobilapp JWT bejelentkezés
export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));

  // Korlát nélkül ez a végpont korlátlan jelszópróbálgatást engedett. Két
  // kulcson: IP-re (egy támadó sok fiókra) és e-mailre (sok IP egy fiókra).
  const ip = getClientIp(req);
  const who = String(email ?? "").toLowerCase().slice(0, 200);
  if (!checkRateLimit(`login-mobile-ip:${ip}`, 10, 15 * 60_000)
   || !checkRateLimit(`login-mobile-email:${who}`, 5, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Túl sok sikertelen próbálkozás. Próbáld újra 15 perc múlva." },
      { status: 429 }
    );
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { email: String(email).toLowerCase() },
      select: { id: true, name: true, email: true, password: true, role: true, emailVerified: true },
    });

    if (!user?.password) {
      return NextResponse.json({ error: "Hibás e-mail vagy jelszó" }, { status: 401 });
    }

    const valid = await verifyPassword(String(password), user.password);
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
      .sign(jwtSecretKey());

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("[api/auth/mobile POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
