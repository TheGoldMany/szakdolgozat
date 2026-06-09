import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(1) });

// POST /api/auth/verify-email – confirm an email address with a token
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen kérés" }, { status: 400 });
  }

  const { token } = parsed.data;

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) {
    return NextResponse.json({ error: "Érvénytelen vagy már felhasznált link" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return NextResponse.json({ error: "A link lejárt. Kérj újat!" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });
    return NextResponse.json({ error: "A felhasználó nem található" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
  ]);

  return NextResponse.json({ ok: true });
}
