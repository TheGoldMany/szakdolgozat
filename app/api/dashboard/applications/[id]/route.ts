import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { sendApplicationStatusEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

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
    include: {
      animal: { select: { shelterId: true, name: true } },
      user:   { select: { email: true, name: true } },
    },
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

  // In-app notifications for all status transitions
  const notifMap = {
    REVIEWING: {
      type:  "APPLICATION_REVIEWING" as const,
      title: "Kérelmed elbírálás alatt",
      body:  `${application.animal.name} – a menhely megkezdte a kérelem feldolgozását.`,
      href:  "/applications",
    },
    APPROVED: {
      type:  "APPLICATION_APPROVED" as const,
      title: "Örökbefogadási kérelmed elfogadva",
      body:  `Gratulálunk! ${application.animal.name} hamarosan a tiéd lehet.`,
      href:  "/applications",
    },
    REJECTED: {
      type:  "APPLICATION_REJECTED" as const,
      title: "Örökbefogadási kérelmed elutasítva",
      body:  parsed.data.reviewNotes
        ? `${application.animal.name}: ${parsed.data.reviewNotes}`
        : `${application.animal.name} – a menhely elutasította a kérelmet.`,
      href:  "/applications",
    },
  };
  createNotification({ userId: application.userId, ...notifMap[parsed.data.status] })
    .catch((err) => console.error("Application notification error:", err));

  // Auto-create follow-up schedule when approved
  if (parsed.data.status === "APPROVED") {
    const now = Date.now();
    const days = (d: number) => new Date(now + d * 86_400_000);
    prisma.adoptionFollowUp.createMany({
      data: [
        { applicationId: params.id, scheduledAt: days(7) },
        { applicationId: params.id, scheduledAt: days(30) },
        { applicationId: params.id, scheduledAt: days(90) },
      ],
    }).then(() =>
      createNotification({
        userId: application.userId,
        type:   "FOLLOW_UP_DUE",
        title:  "Utánkövetés ütemezve",
        body:   `${application.animal.name} – 1 hét, 1 hónap és 3 hónap elteltével visszajelzést kérünk.`,
        href:   "/followups",
      })
    ).catch((err) => console.error("Follow-up schedule error:", err));
  }

  // Send email notification when status is final
  if (
    (parsed.data.status === "APPROVED" || parsed.data.status === "REJECTED") &&
    application.user?.email
  ) {
    sendApplicationStatusEmail({
      to:          application.user.email,
      name:        application.user.name ?? "Felhasználó",
      animalName:  application.animal.name,
      status:      parsed.data.status,
      reviewNotes: parsed.data.reviewNotes ?? null,
    }).catch((err) => console.error("Application status email error:", err));
  }

  return NextResponse.json({ application: updated });
}
