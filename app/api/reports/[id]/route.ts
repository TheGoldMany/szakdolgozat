import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  status: z.nativeEnum(ReportStatus),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const report = await prisma.animalReport.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isOwner   = report.userId === user!.id;
  const isAdmin   = user!.role === "SUPER_ADMIN" || user!.role === "SHELTER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  try {
    const updated = await prisma.animalReport.update({
      where: { id: params.id },
      data:  { status: parsed.data.status },
    });

    // Notify reporter if logged-in user reported it
    if (report.userId && report.userId !== user!.id) {
      const statusLabel: Record<string, string> = {
        RESOLVED:   "megoldva",
        DISMISSED:  "elutasítva",
        IN_PROGRESS: "folyamatban",
      };
      createNotification({
        userId: report.userId,
        type:   "REPORT_RESOLVED",
        title:  "Bejelentésed státusza frissítve",
        body:   `Állapot: ${statusLabel[parsed.data.status] ?? parsed.data.status}`,
        href:   "/reports",
      }).catch(() => {});
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error('[api/reports/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
