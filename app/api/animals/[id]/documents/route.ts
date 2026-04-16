import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name:      z.string().min(1).max(200),
  url:       z.string().url(),
  fileType:  z.string().min(1),
  sizeBytes: z.number().int().positive().optional(),
});

async function canManageAnimal(animalId: string, userId: string, role: string) {
  if (role === "SUPER_ADMIN") return true;
  const animal = await prisma.animal.findUnique({ where: { id: animalId }, select: { shelterId: true } });
  if (!animal) return false;
  const admin = await prisma.shelterAdmin.findFirst({ where: { userId, shelterId: animal.shelterId } });
  return !!admin;
}

// GET /api/animals/[id]/documents
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const docs = await prisma.animalDocument.findMany({
    where:   { animalId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

// POST /api/animals/[id]/documents
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  if (!(await canManageAnimal(params.id, session.user.id, session.user.role ?? ""))) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const doc = await prisma.animalDocument.create({
    data: { animalId: params.id, ...parsed.data },
  });

  return NextResponse.json(doc, { status: 201 });
}
