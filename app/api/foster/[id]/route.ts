import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendFosterStatusEmail } from "@/lib/email";
import { FosterStatus } from "@prisma/client";

const schema = z.object({
  status:    z.nativeEnum(FosterStatus).optional(),
  adminNote: z.string().max(2000).nullable().optional(),
});

// PATCH /api/foster/[id] – admin jóváhagyja / elutasítja / módosítja
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });

  const foster = await prisma.fosterProfile.findUnique({
    where:  { id: params.id },
    select: { shelterId: true, userId: true, status: true },
  });
  if (!foster) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  if (session.user.role !== "SUPER_ADMIN") {
    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: foster.shelterId },
    });
    if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const updated = await prisma.fosterProfile.update({
    where: { id: params.id },
    data:  parsed.data,
    include: {
      shelter:         { select: { name: true } },
      user:            { select: { name: true } },
      fosteredAnimals: { select: { id: true, name: true, slug: true } },
    },
  });

  // Értesítés a státuszváltásról
  if (parsed.data.status && parsed.data.status !== foster.status) {
    if (parsed.data.status === "ACTIVE") {
      createNotification({
        userId: foster.userId,
        type:   "FOSTER_APPROVED",
        title:  "Ideiglenes befogadás jóváhagyva",
        body:   `A(z) ${updated.shelter.name} jóváhagyta az ideiglenes befogadói jelentkezésedet.`,
        href:   "/foster",
      }).catch(() => {});
    } else if (parsed.data.status === "REJECTED") {
      createNotification({
        userId: foster.userId,
        type:   "FOSTER_REJECTED",
        title:  "Ideiglenes befogadás elutasítva",
        body:   `A(z) ${updated.shelter.name} sajnos elutasította a jelentkezésedet.`,
        href:   "/foster",
      }).catch(() => {});
    }
    // Send status email to the applicant
    const fosterUser = await prisma.user.findUnique({
      where:  { id: foster.userId },
      select: { email: true, name: true },
    });
    if (fosterUser?.email && (parsed.data.status === "ACTIVE" || parsed.data.status === "REJECTED")) {
      sendFosterStatusEmail({
        to:          fosterUser.email,
        name:        fosterUser.name ?? "Felhasználó",
        shelterName: updated.shelter.name,
        status:      parsed.data.status as "ACTIVE" | "REJECTED",
        adminNote:   parsed.data.adminNote ?? null,
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
