import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/posts/[id] – a posztot a menhely adminja vagy super admin törölheti
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { id: true, shelterId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "A poszt nem található" }, { status: 404 });
  }

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: post.shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
