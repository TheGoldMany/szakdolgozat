import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

// POST /api/application-forms/[id]/approve – SUPER_ADMIN only
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Csak főadmin hagyhat jóvá sablont" }, { status: 403 });
  }

  try {
    const form = await prisma.applicationForm.findUnique({ where: { id: params.id } });
    if (!form) {
      return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
    }

    const updated = await prisma.applicationForm.update({
      where: { id: params.id },
      data: { status: "APPROVED" },
    });

    logAudit({
      actorId:    session.user.id,
      action:     "FORM_APPROVED",
      targetType: "ApplicationForm",
      targetId:   updated.id,
      targetName: form.title,
    });

    // Notify shelter admins
    const admins = await prisma.shelterAdmin.findMany({
      where:  { shelterId: form.shelterId },
      select: { userId: true },
    });
    createNotifications(admins.map((a) => ({
      userId: a.userId,
      type:   "FORM_APPROVED" as const,
      title:  "Kérvénysablon jóváhagyva",
      body:   form.title,
      href:   "/dashboard/application-forms",
    }))).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/application-forms/[id]/approve POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
