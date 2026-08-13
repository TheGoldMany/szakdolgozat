import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geo";

const patchSchema = z.object({
  name:         z.string().min(1).max(200).optional(),
  address:      z.string().min(1).max(200).optional(),
  city:         z.string().min(1).max(100).optional(),
  zipCode:      z.string().max(20).nullable().optional(),
  phone:        z.string().max(40).nullable().optional(),
  email:        z.string().email().nullable().optional().or(z.literal("")),
  website:      z.string().url().nullable().optional().or(z.literal("")),
  openingHours: z.string().max(500).nullable().optional(),
  note:         z.string().max(1000).nullable().optional(),
  isEmergency:  z.boolean().optional(),
  isActive:     z.boolean().optional(),
  lat:          z.number().min(-90).max(90).nullable().optional(),
  lng:          z.number().min(-180).max(180).nullable().optional(),
  /** Igaz esetén a címből újra geokódolunk (felülírja a koordinátákat). */
  regeocode:    z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }
  const { regeocode, ...data } = parsed.data;

  try {
    const existing = await prisma.vetClinic.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "A rendelő nem található" }, { status: 404 });

    let coords: { lat: number | null; lng: number | null } | null = null;
    if (regeocode) {
      const geo = await geocodeAddress({
        address: data.address ?? existing.address,
        city:    data.city    ?? existing.city,
        zipCode: data.zipCode ?? existing.zipCode,
      });
      coords = { lat: geo?.lat ?? null, lng: geo?.lng ?? null };
    }

    const vet = await prisma.vetClinic.update({
      where: { id: params.id },
      data: {
        ...data,
        email:   data.email   === "" ? null : data.email,
        website: data.website === "" ? null : data.website,
        ...(coords ?? {}),
      },
    });
    return NextResponse.json(vet);
  } catch (error) {
    console.error("[api/admin/vets/[id] PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    await prisma.vetClinic.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/vets/[id] DELETE]", error);
    return NextResponse.json({ error: "A törlés nem sikerült" }, { status: 500 });
  }
}
