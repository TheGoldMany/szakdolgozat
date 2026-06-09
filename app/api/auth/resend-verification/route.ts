import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationToken } from "@/lib/verification";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

// POST /api/auth/resend-verification – resend the verification email
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`resend-verification:${ip}`, 3, 15 * 60_000)) {
    return NextResponse.json({ ok: true }); // silent throttle
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen email cím" }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, name: true, emailVerified: true, password: true },
    });

    // Csak meg nem erősített, jelszavas fióknak küldünk – de a választ nem áruljuk el
    if (user && user.password && !user.emailVerified) {
      await issueVerificationToken(email, user.name);
    }
  } catch (error) {
    console.error("Resend verification error:", error);
  }

  // Mindig 200 – ne szivárogtassuk, létezik-e a cím
  return NextResponse.json({ ok: true });
}
