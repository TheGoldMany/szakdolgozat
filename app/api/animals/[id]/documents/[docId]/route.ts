import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/animals/[id]/documents/[docId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const doc = await prisma.animalDocument.findUnique({ where: { id: params.docId } });
    if (!doc || doc.animalId !== params.id) {
      return NextResponse.json({ error: "Dokumentum nem található" }, { status: 404 });
    }

    const role = session.user.role ?? "";
    if (role !== "SUPER_ADMIN") {
      const animal = await prisma.animal.findUnique({ where: { id: params.id }, select: { shelterId: true } });
      const admin  = await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id, shelterId: animal?.shelterId ?? "" } });
      if (!admin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    await prisma.animalDocument.delete({ where: { id: params.docId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/animals/[id]/documents/[docId] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
