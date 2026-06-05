import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotifications } from "@/lib/notifications";

// GET /api/apply/[token] – get form and animal info for the token
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const application = await prisma.adoptionApplication.findUnique({
    where: { inviteToken: params.token },
    include: {
      form: {
        include: {
          fields: { orderBy: { order: "asc" } },
        },
      },
      animal: {
        select: {
          id:     true,
          name:   true,
          slug:   true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Érvénytelen vagy lejárt meghívó" }, { status: 404 });
  }

  if (application.status !== "INVITED") {
    return NextResponse.json({ error: "Ez a meghívó már felhasználásra került" }, { status: 409 });
  }

  return NextResponse.json({
    animalName:  application.animal.name,
    animalSlug:  application.animal.slug,
    animalImage: application.animal.images[0]?.url ?? null,
    formTitle:   application.form?.title ?? "Örökbefogadási kérvény",
    formDescription: application.form?.description ?? null,
    fields:      application.form?.fields ?? [],
  });
}

const responseSchema = z.object({
  responses: z.array(
    z.object({
      fieldId: z.string(),
      value:   z.string().optional(),
      fileUrl: z.string().url().optional(),
    })
  ),
});

// POST /api/apply/[token] – submit the form
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const application = await prisma.adoptionApplication.findUnique({
    where: { inviteToken: params.token },
    include: {
      form:   { include: { fields: true } },
      animal: { select: { shelterId: true, name: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Érvénytelen vagy lejárt meghívó" }, { status: 404 });
  }

  if (application.status !== "INVITED") {
    return NextResponse.json({ error: "Ez a meghívó már felhasználásra került" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const { responses } = parsed.data;

  // Validate required fields
  if (application.form) {
    for (const field of application.form.fields) {
      if (field.required) {
        const resp = responses.find((r) => r.fieldId === field.id);
        const hasValue = resp && (resp.value?.trim() || resp.fileUrl);
        if (!hasValue) {
          return NextResponse.json(
            { error: `A "${field.label}" mező kitöltése kötelező.` },
            { status: 400 }
          );
        }
      }
    }
  }

  // Create responses, update application status, update animal status
  await prisma.$transaction([
    prisma.formFieldResponse.createMany({
      data: responses.map((r) => ({
        applicationId: application.id,
        fieldId:       r.fieldId,
        value:         r.value ?? null,
        fileUrl:       r.fileUrl ?? null,
      })),
    }),
    prisma.adoptionApplication.update({
      where: { id: application.id },
      data:  { status: "PENDING" },
    }),
    prisma.animal.update({
      where: { id: application.animalId },
      data:  {
        status: {
          set: "PENDING",
        },
      },
    }),
  ]);

  // Notify shelter admins about new application
  const admins = await prisma.shelterAdmin.findMany({
    where:  { shelterId: application.animal.shelterId },
    select: { userId: true },
  });
  createNotifications(admins.map((a) => ({
    userId: a.userId,
    type:   "APPLICATION_SUBMITTED" as const,
    title:  "Új örökbefogadási kérelem érkezett",
    body:   `Beérkezett kérelem: ${application.animal.name}`,
    href:   "/dashboard/applications",
  }))).catch(() => {});

  return NextResponse.json({ success: true, animalSlug: application.animalId });
}
