import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordChangedEmail } from "@/lib/email";
import { requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8, "Legalább 8 karakter szükséges"),
});

/**
 * POST /api/auth/change-password
 *
 * `requireAuthUser`, nem `getServerSession`: az utóbbi CSAK böngésző-
 * munkamenetet fogad el, tehát a mobilalkalmazás `Bearer` tokenjével a jelszó
 * megváltoztatása lehetetlen volt. A `requireAuthUser` előbb a session-t
 * nézi, utána a fejlécet — a webes viselkedés változatlan.
 */
export async function POST(req: NextRequest) {
  const { user: authUser, error: authError } = await requireAuthUser(req);
  if (authError) return authError;

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
      where:  { id: authUser!.id },
      select: { password: true, email: true, name: true },
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
      where: { id: authUser!.id },
      data:  { password: hashed },
    });

    if (user.email) {
      sendPasswordChangedEmail({ to: user.email, name: user.name ?? user.email })
        .catch((err) => console.error("[change-password email]", err));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/auth/change-password POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
