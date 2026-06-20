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

const patchSchema = z.object({
  title:       z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  fields:      z.array(fieldSchema).optional(),
});

async function getShelterForAdmin(userId: string) {
  const rec = await prisma.shelterAdmin.findFirst({
    where: { userId },
    select: { shelterId: true },
  });
  return rec?.shelterId ?? null;
}

// PATCH /api/application-forms/[id] – update form (only if DRAFT)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SHELTER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultság" }, { status: 403 });
  }

  try {
    const shelterId = await getShelterForAdmin(session.user.id);
    if (!shelterId) {
      return NextResponse.json({ error: "Nem tartozol menhelyhez" }, { status: 403 });
    }

    const form = await prisma.applicationForm.findUnique({ where: { id: params.id } });
    if (!form || form.shelterId !== shelterId) {
      return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
    }
    if (form.status !== "DRAFT") {
      return NextResponse.json({ error: "Csak piszkozat állapotban szerkeszthető" }, { status: 409 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
    }

    const { title, description, fields } = parsed.data;

    // Rebuild fields if provided
    if (fields !== undefined) {
      await prisma.formField.deleteMany({ where: { formId: params.id } });
    }

    const updated = await prisma.applicationForm.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(fields !== undefined && {
          fields: {
            create: fields.map((f) => ({
              label:    f.label,
              type:     f.type,
              required: f.required,
              order:    f.order,
            })),
          },
        }),
      },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/application-forms/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/application-forms/[id]
export async function DELETE(
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

  try {
    const shelterId = await getShelterForAdmin(session.user.id);
    if (!shelterId) {
      return NextResponse.json({ error: "Nem tartozol menhelyhez" }, { status: 403 });
    }

    const form = await prisma.applicationForm.findUnique({ where: { id: params.id } });
    if (!form || form.shelterId !== shelterId) {
      return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
    }

    await prisma.applicationForm.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/application-forms/[id] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/application-forms/[id] – get single form
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const shelterId = session.user.role === "SHELTER_ADMIN"
      ? await getShelterForAdmin(session.user.id)
      : null;

    const form = await prisma.applicationForm.findUnique({
      where: { id: params.id },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
    }

    // Shelter admin can only see own shelter's forms, super admin can see all
    if (session.user.role === "SUPER_ADMIN") {
      return NextResponse.json(form);
    }
    if (form.shelterId !== shelterId) {
      return NextResponse.json({ error: "Nincs hozzáférés" }, { status: 403 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error('[api/application-forms/[id] GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
