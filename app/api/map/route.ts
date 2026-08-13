import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/map  – jelentések + menhelyek + állatorvosi rendelők koordinátákkal
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type   = searchParams.get("type");    // LOST | FOUND | STRAY
  const status = searchParams.get("status") ?? "ACTIVE";

  try {
    const [reports, shelters, vets] = await Promise.all([
      prisma.animalReport.findMany({
        where: {
          lat:    { not: null },
          lng:    { not: null },
          ...(status !== "ALL" && { status: status as never }),
          ...(type   && { type: type as never }),
        },
        select: {
          id:          true,
          type:        true,
          animalType:  true,
          name:        true,
          breed:       true,
          city:        true,
          description: true,
          imageUrl:    true,
          lat:         true,
          lng:         true,
          status:      true,
          createdAt:   true,
          contactPhone: true,
          contactName:  true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.shelter.findMany({
        where: { isActive: true, lat: { not: null }, lng: { not: null } },
        select: {
          id:         true,
          name:       true,
          city:       true,
          address:    true,
          phone:      true,
          email:      true,
          isVerified: true,
          logoUrl:    true,
          lat:        true,
          lng:        true,
          slug:       true,
          _count:     { select: { animals: { where: { status: "AVAILABLE" } } } },
        },
      }),
      prisma.vetClinic.findMany({
        where: { isActive: true, lat: { not: null }, lng: { not: null } },
        select: {
          id:           true,
          name:         true,
          city:         true,
          address:      true,
          phone:        true,
          website:      true,
          openingHours: true,
          isEmergency:  true,
          lat:          true,
          lng:          true,
        },
      }),
    ]);

    return NextResponse.json({ reports, shelters, vets });
  } catch (error) {
    console.error('[api/map GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
