import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.shelterDocument.findUnique({ where: { id: params.docId } });
  if (!doc || doc.shelterId !== params.id)
    return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  let isShelterAdmin = false;
  if (session.user.role === "SHELTER_ADMIN") {
    const record = await prisma.shelterAdmin.findFirst({
      where: { shelterId: params.id, userId: session.user.id },
    });
    isShelterAdmin = !!record;
  }
  if (!isSuperAdmin && !isShelterAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.shelterDocument.delete({ where: { id: params.docId } });
  return NextResponse.json({ ok: true });
}
