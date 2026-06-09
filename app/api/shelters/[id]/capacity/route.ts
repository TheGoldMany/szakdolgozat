import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  capacity: z.number().int().min(1).max(10000).nullable(),
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
  if (!parsed.success) return NextResponse.json({ error: "Hibas adat" }, { status: 400 });

  const shelter = await prisma.shelter.update({
    where: { id: params.id },
    data:  { capacity: parsed.data.capacity },
    select: { capacity: true },
  });

  return NextResponse.json(shelter);
}
