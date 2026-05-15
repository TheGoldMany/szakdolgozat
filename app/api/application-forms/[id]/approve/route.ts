import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/application-forms/[id]/approve – SUPER_ADMIN only
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Csak főadmin hagyhat jóvá sablont" }, { status: 403 });
  }

  const form = await prisma.applicationForm.findUnique({ where: { id: params.id } });
  if (!form) {
    return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
  }

  const updated = await prisma.applicationForm.update({
    where: { id: params.id },
    data: { status: "APPROVED" },
  });

  return NextResponse.json(updated);
}
