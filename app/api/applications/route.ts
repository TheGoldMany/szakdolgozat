import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus } from "@prisma/client";

const applicationSchema = z.object({
  animalId:    z.string().min(1),
  message:     z.string().optional(),
  homeType:    z.enum(["HOUSE", "APARTMENT", "OTHER"]).optional(),
  hasGarden:   z.boolean().optional(),
  hasChildren: z.boolean().optional(),
  hasPets:     z.boolean().optional(),
  experience:  z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { animalId, ...rest } = parsed.data;

  // Check animal exists and is available
  const animal = await prisma.animal.findUnique({ where: { id: animalId } });
  if (!animal) {
    return NextResponse.json({ error: "Az állat nem található" }, { status: 404 });
  }
  if (animal.status !== AnimalStatus.AVAILABLE) {
    return NextResponse.json({ error: "Ez az állat jelenleg nem fogadható örökbe" }, { status: 409 });
  }

  // Check duplicate
  const existing = await prisma.adoptionApplication.findUnique({
    where: { userId_animalId: { userId: session.user.id, animalId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Már nyújtottál be kérelmet ehhez az állathoz" }, { status: 409 });
  }

  const application = await prisma.adoptionApplication.create({
    data: { userId: session.user.id, animalId, ...rest },
  });

  return NextResponse.json({ application }, { status: 201 });
}
