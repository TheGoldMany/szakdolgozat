import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const application = await prisma.adoptionApplication.findUnique({
    where: { id: params.id },
  });

  if (!application) {
    return NextResponse.json({ error: "Kérelem nem található" }, { status: 404 });
  }

  if (application.userId !== session.user.id) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  if (application.status !== ApplicationStatus.PENDING) {
    return NextResponse.json(
      { error: "Csak PENDING státuszú kérelem vonható vissza" },
      { status: 409 }
    );
  }

  const updated = await prisma.adoptionApplication.update({
    where: { id: params.id },
    data: { status: ApplicationStatus.WITHDRAWN },
  });

  return NextResponse.json({ application: updated });
}
