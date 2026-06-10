import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  dismissed: z.boolean(),
});

/**
 * Egy párosítás visszajelzése ("ez nem az" / mégis releváns).
 * Csak a két érintett bejelentés gazdája vagy admin módosíthatja.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const match = await prisma.reportMatch.findUnique({
    where: { id: params.id },
    include: {
      reportA: { select: { userId: true } },
      reportB: { select: { userId: true } },
    },
  });
  if (!match) {
    return NextResponse.json({ error: "Találat nem található" }, { status: 404 });
  }

  const role = session?.user?.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "SHELTER_ADMIN";
  const isOwner =
    !!session?.user?.id &&
    (match.reportA.userId === session.user.id || match.reportB.userId === session.user.id);

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Nincs jogosultság" }, { status: 403 });
  }

  const updated = await prisma.reportMatch.update({
    where: { id: params.id },
    data: { dismissed: parsed.data.dismissed },
  });
  return NextResponse.json({ match: updated });
}
