import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { AnimalType, ReportStatus, ReportType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geo";
import { logAudit } from "@/lib/audit";

/**
 * Bejelentés kezelése a platform szintjén (csak SUPER_ADMIN).
 *
 * A bejelentő a saját bejelentésének csak az állapotát és a térképes helyét
 * módosíthatja (`/api/reports/[id]`). Itt a főadmin minden szöveges mezőt
 * javíthat: elírt cím, rossz fajta, a leírásba írt sértő szöveg.
 */

const patchSchema = z.object({
  type:         z.nativeEnum(ReportType).optional(),
  status:       z.nativeEnum(ReportStatus).optional(),
  animalType:   z.nativeEnum(AnimalType).optional(),
  name:         z.string().max(100).nullable().optional(),
  breed:        z.string().max(100).nullable().optional(),
  color:        z.string().max(100).nullable().optional(),
  gender:       z.string().max(20).nullable().optional(),
  description:  z.string().min(1).max(5000).optional(),
  city:         z.string().min(1).max(100).optional(),
  address:      z.string().max(200).nullable().optional(),
  contactName:  z.string().min(1).max(100).optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  contactEmail: z.string().email().max(200).optional(),
  /** Igaz esetén a (módosított) címből újra kerestetjük a térképes helyet. */
  regeocode:    z.boolean().optional(),
});

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "SUPER_ADMIN" ? session.user : null;
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" }, { status: 400 });
  }
  const { regeocode, ...data } = parsed.data;

  const existing = await prisma.animalReport.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "A bejelentés nem található" }, { status: 404 });

  try {
    let coords: { lat: number; lng: number } | null = null;
    if (regeocode) {
      coords = await geocodeAddress({
        city:    data.city    ?? existing.city,
        address: data.address !== undefined ? data.address : existing.address,
      });
    }

    const report = await prisma.animalReport.update({
      where: { id: params.id },
      data:  { ...data, ...(coords ?? {}) },
    });

    logAudit({
      actorId: admin.id, action: "REPORT_EDITED",
      targetType: "AnimalReport", targetId: report.id,
      targetName: `${report.name ?? "Névtelen"} (${report.city})`,
    });
    return NextResponse.json({ report, regeocoded: Boolean(coords) });
  } catch (error) {
    console.error("[api/admin/reports/[id] PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });

  const reason = new URL(req.url).searchParams.get("reason")?.slice(0, 500) || null;

  const existing = await prisma.animalReport.findUnique({
    where: { id: params.id }, select: { id: true, name: true, city: true },
  });
  if (!existing) return NextResponse.json({ error: "A bejelentés nem található" }, { status: 404 });

  try {
    // A képek és a párosítások a sémában kaszkádolva törlődnek.
    await prisma.animalReport.delete({ where: { id: params.id } });
    logAudit({
      actorId: admin.id, action: "REPORT_DELETED",
      targetType: "AnimalReport", targetId: existing.id,
      targetName: `${existing.name ?? "Névtelen"} (${existing.city})`,
      reason,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/reports/[id] DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
