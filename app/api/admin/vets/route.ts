import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geo";

const createSchema = z.object({
  name:         z.string().min(1).max(200),
  address:      z.string().min(1).max(200),
  city:         z.string().min(1).max(100),
  zipCode:      z.string().max(20).optional().or(z.literal("")),
  phone:        z.string().max(40).optional().or(z.literal("")),
  email:        z.string().email().optional().or(z.literal("")),
  website:      z.string().url().optional().or(z.literal("")),
  openingHours: z.string().max(500).optional().or(z.literal("")),
  note:         z.string().max(1000).optional().or(z.literal("")),
  isEmergency:  z.boolean().optional(),
  // Kézzel megadott koordináta (térképre kattintva) – ha jön, ezt használjuk
  lat:          z.number().min(-90).max(90).optional(),
  lng:          z.number().min(-180).max(180).optional(),
});

// GET /api/admin/vets – összes rendelő (super admin)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    const vets = await prisma.vetClinic.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] });
    return NextResponse.json(vets);
  } catch (error) {
    console.error("[api/admin/vets GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/admin/vets – új rendelő (super admin)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  try {
    // Kézi koordináta elsőbbséget élvez; különben a címből geokódolunk
    let lat = d.lat ?? null;
    let lng = d.lng ?? null;
    if (lat == null || lng == null) {
      const geo = await geocodeAddress({ address: d.address, city: d.city, zipCode: d.zipCode || null });
      lat = geo?.lat ?? null;
      lng = geo?.lng ?? null;
    }

    const vet = await prisma.vetClinic.create({
      data: {
        name:         d.name,
        address:      d.address,
        city:         d.city,
        zipCode:      d.zipCode      || null,
        phone:        d.phone        || null,
        email:        d.email        || null,
        website:      d.website      || null,
        openingHours: d.openingHours || null,
        note:         d.note         || null,
        isEmergency:  d.isEmergency ?? false,
        lat, lng,
      },
    });
    return NextResponse.json(vet, { status: 201 });
  } catch (error) {
    console.error("[api/admin/vets POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
