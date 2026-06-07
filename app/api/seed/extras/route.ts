import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedNewModules } from "@/lib/seed-extras";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/**
 * POST /api/seed/extras
 *
 * Csak az új modulok (kennel, foster, sponsorship, behaviorLog, event)
 * adatait törli és újraseedeli – a felhasználók, menhelyek, állatok MEGMARADNAK.
 *
 * Konzolból:
 *   fetch('/api/seed/extras',{method:'POST'}).then(r=>r.json()).then(console.log)
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  try {
    // ── Törlés (csak az új modulok) ──────────────────────────────────────────
    await prisma.eventRegistration.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.sponsorship.deleteMany({});
    await prisma.fosterSupplyLog.deleteMany({});
    await prisma.fosterProfile.deleteMany({});
    await prisma.behaviorLog.deleteMany({});
    // kennelnél fontos: előbb nullázni az állat kennelId-ját
    await prisma.animal.updateMany({ where: { kennelId: { not: null } }, data: { kennelId: null } });
    await prisma.kennel.deleteMany({});

    // ── Meglévő adatok betöltése ──────────────────────────────────────────────
    const [shelterAdmins, allAnimals, allUsers] = await Promise.all([
      prisma.shelterAdmin.findMany({ select: { shelterId: true, userId: true } }),
      prisma.animal.findMany({ select: { id: true, shelterId: true, status: true, type: true } }),
      prisma.user.findMany({ where: { role: "USER" }, select: { id: true } }),
    ]);

    // shelterId → adminId map (first admin per shelter)
    const adminByShelter: Record<string, string> = {};
    for (const sa of shelterAdmins) {
      if (!adminByShelter[sa.shelterId]) adminByShelter[sa.shelterId] = sa.userId;
    }
    const shelters = Object.entries(adminByShelter).map(([id, adminId]) => ({ id, adminId }));

    const stats = await seedNewModules({ shelters, allAnimals, allUsers });

    return NextResponse.json({ success: true, ...stats }, { headers: CORS });
  } catch (err) {
    console.error("Extras seed error:", err);
    return NextResponse.json({ error: "Seed failed", detail: String(err) }, { status: 500, headers: CORS });
  }
}
