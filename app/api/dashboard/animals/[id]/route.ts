import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAnimalSponsors } from "@/lib/notifications";
import { AnimalStatus } from "@prisma/client";

const schema = z.object({
  status: z.nativeEnum(AnimalStatus),
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

  const animal = await prisma.animal.findUnique({ where: { id: params.id } });
  if (!animal) {
    return NextResponse.json({ error: "Állat nem található" }, { status: 404 });
  }

  if (role === "SHELTER_ADMIN") {
    const admin = await prisma.shelterAdmin.findUnique({
      where: { userId_shelterId: { userId: session.user.id, shelterId: animal.shelterId } },
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

  const updated = await prisma.animal.update({
    where: { id: params.id },
    data: {
      status:    parsed.data.status,
      adoptedAt: parsed.data.status === AnimalStatus.ADOPTED ? new Date() : undefined,
    },
  });

  // Ha az állat gazdira talált, értesítjük a virtuális gazdikat
  if (parsed.data.status === AnimalStatus.ADOPTED && animal.status !== AnimalStatus.ADOPTED) {
    notifyAnimalSponsors(
      params.id,
      `${updated.name} gazdira talált!`,
      "A virtuális örökbefogadásoddal támogatott állat új otthonba került. Köszönjük a segítséget!",
      `/animals/${updated.slug}`,
    ).catch(() => {});
  }

  return NextResponse.json({ animal: updated });
}
