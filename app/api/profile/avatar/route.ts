import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  image: z.string().url(),
});

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adat" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: user!.id },
      data:  { image: parsed.data.image },
    });

    return NextResponse.json({ image: parsed.data.image });
  } catch (error) {
    console.error('[api/profile/avatar PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
