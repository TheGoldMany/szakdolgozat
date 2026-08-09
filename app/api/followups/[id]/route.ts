import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  wellbeing: z.number().int().min(1).max(5),
  notes:     z.string().max(2000).optional(),
  photoUrl:  z.string().url().optional(),
});

// PATCH /api/followups/[id] – user submits a follow-up response
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    const followUp = await prisma.adoptionFollowUp.findUnique({
      where:   { id: params.id },
      include: {
        application: {
          select: {
            userId:  true,
            animal:  { select: { name: true, shelterId: true } },
          },
        },
      },
    });

    if (!followUp) {
      return NextResponse.json({ error: "Nem található" }, { status: 404 });
    }
    if (followUp.application.userId !== user!.id) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
    if (followUp.status === "COMPLETED") {
      return NextResponse.json({ error: "Már kitöltve" }, { status: 409 });
    }

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
    }

    const updated = await prisma.adoptionFollowUp.update({
      where: { id: params.id },
      data: {
        status:      "COMPLETED",
        completedAt: new Date(),
        wellbeing:   parsed.data.wellbeing,
        notes:       parsed.data.notes ?? null,
        photoUrl:    parsed.data.photoUrl ?? null,
      },
    });

    // Notify shelter admins
    const admins = await prisma.shelterAdmin.findMany({
      where:  { shelterId: followUp.application.animal.shelterId },
      select: { userId: true },
    });
    const dueDateStr = followUp.scheduledAt.toLocaleDateString("hu-HU", { month: "long", day: "numeric" });
    createNotifications(admins.map((a) => ({
      userId: a.userId,
      type:   "FOLLOW_UP_RECEIVED" as const,
      title:  "Utánkövetési visszajelzés érkezett",
      body:   `${followUp.application.animal.name} – ${dueDateStr} (${parsed.data.wellbeing}/5)`,
      href:   "/dashboard/followups",
    }))).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/followups/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
