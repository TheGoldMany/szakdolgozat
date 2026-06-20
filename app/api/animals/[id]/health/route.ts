import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAnimalSponsors } from "@/lib/notifications";
import { HealthRecordType } from "@prisma/client";

const schema = z.object({
  type:        z.nativeEnum(HealthRecordType),
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  date:        z.string().datetime(),
  nextDueDate: z.string().datetime().optional(),
  vetName:     z.string().max(100).optional(),
});

// GET /api/animals/[id]/health
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const records = await prisma.healthRecord.findMany({
      where:   { animalId: params.id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('[api/animals/[id]/health GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/animals/[id]/health  – csak a menhely saját adminja adhat hozzá
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    // Jogosultság: a menhely adminja vagy SUPER_ADMIN
    const animal = await prisma.animal.findUnique({
      where:  { id: params.id },
      select: { shelterId: true },
    });
    if (!animal) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: animal.shelterId },
    });
    if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
    }

    const record = await prisma.healthRecord.create({
      data: {
        animalId:    params.id,
        createdById: session.user.id,
        ...parsed.data,
        date:        new Date(parsed.data.date),
        nextDueDate: parsed.data.nextDueDate ? new Date(parsed.data.nextDueDate) : null,
      },
      include: { createdBy: { select: { name: true } } },
    });

    // Virtuális gazdik értesítése az egészségügyi napló frissüléséről
    const animalInfo = await prisma.animal.findUnique({
      where:  { id: params.id },
      select: { name: true, slug: true },
    });
    if (animalInfo) {
      notifyAnimalSponsors(
        params.id,
        `Frissült ${animalInfo.name} egészségügyi naplója`,
        record.title,
        `/animals/${animalInfo.slug}`,
      ).catch(() => {});
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('[api/animals/[id]/health POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
