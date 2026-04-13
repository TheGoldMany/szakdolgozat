import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

const schema = z.object({
  status:      z.enum(["REVIEWING", "APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const application = await prisma.adoptionApplication.findUnique({
    where: { id: params.id },
    include: { animal: { select: { shelterId: true } } },
  });

  if (!application) {
    return NextResponse.json({ error: "Kérelem nem található" }, { status: 404 });
  }

  // Shelter admin csak a saját menhelyéhez tartozó kérelmet kezelheti
  if (role === "SHELTER_ADMIN") {
    const admin = await prisma.shelterAdmin.findUnique({
      where: {
        userId_shelterId: {
          userId:    session.user.id,
          shelterId: application.animal.shelterId,
        },
      },
    });
    if (!admin) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const updated = await prisma.adoptionApplication.update({
    where: { id: params.id },
    data: {
      status:      parsed.data.status as ApplicationStatus,
      reviewNotes: parsed.data.reviewNotes,
      reviewedAt:  new Date(),
    },
  });

  return NextResponse.json({ application: updated });
}
