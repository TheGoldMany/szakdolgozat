import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/animals/[id]/behavior/[logId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; logId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const record = await prisma.behaviorLog.findUnique({
    where:   { id: params.logId },
    include: { animal: { select: { shelterId: true } } },
  });
  if (!record) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: record.animal.shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  await prisma.behaviorLog.delete({ where: { id: params.logId } });
  return NextResponse.json({ success: true });
}
