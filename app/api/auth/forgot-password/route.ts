import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { newOneTimeToken } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60_000)) {
    return NextResponse.json({ ok: true }); // silent throttle – don't reveal limiting
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen email cím" }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
    });

    // Respond with 200 regardless – never reveal if email exists
    if (!user || !user.password) {
      return NextResponse.json({ ok: true });
    }

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // A felhasználó a nyers tokent kapja e-mailben, az adatbázisba csak a hash
    // kerül — lásd `lib/password.ts`, miért.
    const { raw, hashed } = newOneTimeToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token: hashed, expiresAt },
    });

    await sendPasswordResetEmail(email, raw);
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return 200 to avoid leaking info
  }

  return NextResponse.json({ ok: true });
}
