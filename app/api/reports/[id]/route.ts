import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

const schema = z.object({
  status: z.nativeEnum(ReportStatus),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const report = await prisma.animalReport.findUnique({ where: { id: params.id } });
  if (!report) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isOwner   = report.userId === session.user.id;
  const isAdmin   = session.user.role === "SUPER_ADMIN" || session.user.role === "SHELTER_ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const updated = await prisma.animalReport.update({
    where: { id: params.id },
    data:  { status: parsed.data.status },
  });

  // Notify reporter if logged-in user reported it
  if (report.userId && report.userId !== session.user.id) {
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
}
