import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/application-forms/[id]/request-approval
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SHELTER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultság" }, { status: 403 });
  }

  const shelterAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    select: { shelterId: true },
  });
  if (!shelterAdmin) {
    return NextResponse.json({ error: "Nem tartozol menhelyhez" }, { status: 403 });
  }

  const form = await prisma.applicationForm.findUnique({ where: { id: params.id } });
  if (!form || form.shelterId !== shelterAdmin.shelterId) {
    return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
  }
  if (form.status !== "DRAFT") {
    return NextResponse.json({ error: "Csak piszkozat küldhető jóváhagyásra" }, { status: 409 });
  }

  const updated = await prisma.applicationForm.update({
    where: { id: params.id },
    data: { status: "PENDING_APPROVAL" },
  });

  return NextResponse.json(updated);
}
