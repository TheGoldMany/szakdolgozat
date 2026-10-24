import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ReportStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { requireAuthUser } from "@/lib/api-auth";

// Magyarország környéke, kis ráhagyással: egy elcsúszott kattintás ne tegye
// a pöttyöt az óceán közepére.
const schema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  lat:    z.number().min(44).max(50).optional(),
  lng:    z.number().min(15).max(24).optional(),
}).refine((d) => d.status !== undefined || (d.lat !== undefined && d.lng !== undefined), {
  message: "Nincs mit módosítani",
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      data:  {
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(parsed.data.lat !== undefined && parsed.data.lng !== undefined && { lat: parsed.data.lat, lng: parsed.data.lng }),
      },
    });

    // Notify reporter if logged-in user reported it
    if (parsed.data.status && report.userId && report.userId !== user!.id) {
      const statusLabel: Record<string, string> = {
        RESOLVED:   "megoldva",
        DISMISSED:  "elutasítva",
        IN_PROGRESS: "folyamatban",
      };
      createNotification({
        userId: report.userId,
        type:   "REPORT_RESOLVED",
        title:  "Bejelentésed státusza frissítve",
        body:   `Állapot: ${statusLabel[parsed.data.status!] ?? parsed.data.status}`,
        href:   "/reports",
      }).catch(() => {});
    }

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error('[api/reports/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
