import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  status:    z.enum(["ACTIVE", "INACTIVE", "REJECTED"]),
  adminNote: z.string().max(500).optional(),
});

// PATCH /api/volunteers/[id] – admin approves/rejects/deactivates volunteer
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const vol = await prisma.volunteer.findUnique({
    where: { id: params.id },
    select: { shelterId: true },
  });
  if (!vol) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: vol.shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const updated = await prisma.volunteer.update({
    where: { id: params.id },
    data:  { status: parsed.data.status, adminNote: parsed.data.adminNote ?? null },
    include: {
      user: { select: { name: true, email: true } },
      shelter: { select: { name: true } },
    },
  });

  return NextResponse.json(updated);
}
