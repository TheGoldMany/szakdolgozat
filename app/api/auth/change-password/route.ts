import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "Legalább 8 karakter szükséges"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Ez a fiók social login-nal lett létrehozva, nincs jelszava." },
        { status: 400 }
      );
    }

    const valid = await compare(parsed.data.currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "A jelenlegi jelszó helytelen." }, { status: 400 });
    }

    const hashed = await hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { password: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/auth/change-password POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
