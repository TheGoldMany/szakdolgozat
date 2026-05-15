import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { FieldType } from "@prisma/client";

const fieldSchema = z.object({
  label:    z.string().min(1).max(255),
  type:     z.nativeEnum(FieldType),
  required: z.boolean().default(false),
  order:    z.number().int().default(0),
});

const createSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().optional(),
  fields:      z.array(fieldSchema).default([]),
});

// GET /api/application-forms – list forms for the shelter admin's shelter
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SHELTER_ADMIN") {
    return NextResponse.json({ error: "Csak menhely adminok férhetnek hozzá" }, { status: 403 });
  }

  const shelterAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    select: { shelterId: true },
  });
  if (!shelterAdmin) {
    return NextResponse.json({ error: "Nem tartozol menhelyhez" }, { status: 403 });
  }

  const forms = await prisma.applicationForm.findMany({
    where: { shelterId: shelterAdmin.shelterId },
    include: { fields: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(forms);
}

// POST /api/application-forms – create a new form
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SHELTER_ADMIN") {
    return NextResponse.json({ error: "Csak menhely adminok hozhatnak létre sablont" }, { status: 403 });
  }

  const shelterAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    select: { shelterId: true },
  });
  if (!shelterAdmin) {
    return NextResponse.json({ error: "Nem tartozol menhelyhez" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, fields } = parsed.data;

  const form = await prisma.applicationForm.create({
    data: {
      shelterId:   shelterAdmin.shelterId,
      title,
      description: description ?? null,
      fields: {
        create: fields.map((f) => ({
          label:    f.label,
          type:     f.type,
          required: f.required,
          order:    f.order,
        })),
      },
    },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(form, { status: 201 });
}
