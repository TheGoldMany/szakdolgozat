import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

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

  try {
    const application = await prisma.adoptionApplication.create({
      data: { userId: session.user.id, animalId, ...rest },
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Már nyújtottál be kérelmet ehhez az állathoz" }, { status: 409 });
    }
    console.error("Application create error:", error);
    return NextResponse.json({ error: "Nem sikerült elküldeni a kérelmet" }, { status: 500 });
  }
}
