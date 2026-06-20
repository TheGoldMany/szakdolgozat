import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  image: z.string().url(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adat" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { image: parsed.data.image },
    });

    return NextResponse.json({ image: parsed.data.image });
  } catch (error) {
    console.error('[api/profile/avatar PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
