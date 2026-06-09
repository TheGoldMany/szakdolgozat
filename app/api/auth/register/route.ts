import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { issueVerificationToken } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`register:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Túl sok kísérlet. Próbáld újra 1 perc múlva." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Érvénytelen adatok", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Ez az email cím már foglalt." },
        { status: 409 }
      );
    }

    const hashed = await hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, role: true },
    });

    // Email-megerősítő token kiállítása és email küldése (nem blokkoló)
    await issueVerificationToken(email, name).catch((err) => {
      console.error("Verification email error:", err);
    });

    return NextResponse.json({ user, verificationRequired: true }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Szerver hiba." }, { status: 500 });
  }
}
