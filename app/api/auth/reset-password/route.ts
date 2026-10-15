import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, hashToken, passwordTooLong, PASSWORD_MIN } from "@/lib/password";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  token:    z.string().min(1).max(200),
  password: z.string()
    .min(PASSWORD_MIN, "Legalább 8 karakter szükséges")
    .refine((p) => !passwordTooLong(p), "A jelszó túl hosszú (legfeljebb 72 bájt)."),
});

export async function POST(req: NextRequest) {
  // A token 256 bit véletlen, tehát találgatni reménytelen — a korlát mégis
  // kell, mert nélküle ez a végpont korlátlan bcrypt-munkát adna ingyen.
  if (!checkRateLimit(`reset-password:${getClientIp(req)}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Túl sok próbálkozás. Próbáld újra később." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" },
      { status: 400 }
    );
  }

  // Az adatbázisban a token hash-e áll, nem maga a token.
  const token = hashToken(parsed.data.token);
  const { password } = parsed.data;

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Érvénytelen vagy lejárt link" }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: "A link lejárt. Kérj újat!" }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data:  { password: hashed },
      }),
      prisma.passwordResetToken.delete({ where: { token } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Hiba történt, próbáld újra" }, { status: 500 });
  }
}
