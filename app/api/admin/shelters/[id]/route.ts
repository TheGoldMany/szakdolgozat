import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// PATCH /api/admin/shelters/[id] – super admin toggles verification / activation
const schema = z.object({
  isActive:   z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).refine((d) => d.isActive !== undefined || d.isVerified !== undefined, {
  message: "Legalább egy mezőt meg kell adni",
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  try {
    const exists = await prisma.shelter.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!exists) {
      return NextResponse.json({ error: "A menhely nem található" }, { status: 404 });
    }

    const shelter = await prisma.shelter.update({
      where: { id: params.id },
      data:  parsed.data,
      select: { id: true, isActive: true, isVerified: true },
    });

    return NextResponse.json(shelter);
  } catch (error) {
    console.error('[api/admin/shelters/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
