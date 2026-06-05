import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

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
      user:    { select: { name: true, email: true } },
      shelter: { select: { name: true } },
    },
  });

  if (parsed.data.status === "ACTIVE") {
    await createNotification({
      userId: updated.userId,
      type:   "VOLUNTEER_APPROVED",
      title:  "Önkéntes jelentkezésed elfogadva",
      body:   `${updated.shelter.name} visszaigazolta a jelentkezésedet.`,
      href:   `/shelters/${updated.shelter.name}`,
    });
  } else if (parsed.data.status === "REJECTED") {
    await createNotification({
      userId: updated.userId,
      type:   "VOLUNTEER_REJECTED",
      title:  "Önkéntes jelentkezésed elutasítva",
      body:   `${updated.shelter.name}${parsed.data.adminNote ? `: ${parsed.data.adminNote}` : ""}`,
      href:   "/",
    });
  }

  return NextResponse.json(updated);
}
