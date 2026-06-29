import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  lat:     z.number().min(-90).max(90),
  lng:     z.number().min(-180).max(180),
  city:    z.string().max(100).optional(),
  address: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: params.id },
    });
    if (!admin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Hibás adat" }, { status: 400 });

  const { lat, lng, city, address } = parsed.data;

  const shelter = await prisma.shelter.update({
    where: { id: params.id },
    data:  {
      lat,
      lng,
      ...(city    ? { city }    : {}),
      ...(address ? { address } : {}),
    },
    select: { lat: true, lng: true, city: true, address: true },
  });

  return NextResponse.json(shelter);
}
