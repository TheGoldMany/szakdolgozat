import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { requireAuthUser } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    const application = await prisma.adoptionApplication.findUnique({
      where: { id: params.id },
    });

    if (!application) {
      return NextResponse.json({ error: "Kérelem nem található" }, { status: 404 });
    }

    if (application.userId !== user!.id) {
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
  } catch (error) {
    console.error('[api/applications/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
