import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geo";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST /api/admin/shelters/geocode — geocode shelters that have no coordinates yet
export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    const missing = await prisma.shelter.findMany({
      where:  { OR: [{ lat: null }, { lng: null }] },
      select: { id: true, address: true, city: true, zipCode: true },
    });

    let updated = 0;
    let failed  = 0;

    for (const s of missing) {
      const coords = await geocodeAddress({
        address: s.address,
        city:    s.city,
        zipCode: s.zipCode,
        country: "Hungary",
      });
      if (coords) {
        await prisma.shelter.update({
          where: { id: s.id },
          data:  { lat: coords.lat, lng: coords.lng },
        });
        updated++;
      } else {
        failed++;
      }
      // Nominatim usage policy: max ~1 request / second
      await sleep(1100);
    }

    return NextResponse.json({ ok: true, total: missing.length, updated, failed });
  } catch (error) {
    console.error("[api/admin/shelters/geocode]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
