import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { sendNewFosterApplicationEmail } from "@/lib/email";
import { blockIfSuspended } from "@/lib/account-status";
import { AnimalType } from "@prisma/client";

const schema = z.object({
  shelterId:      z.string().min(1),
  preferredTypes: z.array(z.nativeEnum(AnimalType)).optional(),
  maxWeightKg:    z.number().positive().max(200).optional(),
  canQuarantine:  z.boolean().optional(),
  motivation:     z.string().max(2000).optional(),
});

// POST /api/foster – user jelentkezik ideiglenes befogadónak
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  const suspended = await blockIfSuspended(session.user.id);
  if (suspended) return suspended;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }
  const { shelterId, preferredTypes, maxWeightKg, canQuarantine, motivation } = parsed.data;

  try {
    const shelter = await prisma.shelter.findUnique({ where: { id: shelterId }, select: { id: true } });
    if (!shelter) return NextResponse.json({ error: "Menhely nem található" }, { status: 404 });

    const existing = await prisma.fosterProfile.findUnique({
      where: { userId_shelterId: { userId: session.user.id, shelterId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Már jelentkeztél ehhez a menhelyhez" }, { status: 409 });
    }

    const foster = await prisma.fosterProfile.create({
      data: {
        userId:         session.user.id,
        shelterId,
        preferredTypes: preferredTypes ?? [],
        maxWeightKg,
        canQuarantine:  canQuarantine ?? false,
        motivation,
      },
      include: { shelter: { select: { name: true } }, user: { select: { name: true } } },
    });

    const admins = await prisma.shelterAdmin.findMany({
      where:  { shelterId },
      select: { userId: true, user: { select: { email: true, name: true } } },
    });

    const applicantName = foster.user.name ?? "Ismeretlen";

    createNotifications(admins.map((a) => ({
      userId: a.userId,
      type:   "FOSTER_NEW" as const,
      title:  "Új ideiglenes befogadó jelentkezés",
      body:   `${applicantName} ideiglenes befogadónak jelentkezett.`,
      href:   "/dashboard/foster",
    }))).catch(() => {});

    for (const admin of admins) {
      sendNewFosterApplicationEmail({
        to:            admin.user.email,
        adminName:     admin.user.name ?? admin.user.email,
        applicantName,
        shelterName:   foster.shelter.name,
        motivation:    motivation ?? null,
      }).catch((err) => console.error("[foster application email]", err));
    }

    return NextResponse.json(foster, { status: 201 });
  } catch (error) {
    console.error('[api/foster POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/foster – a bejelentkezett user ideiglenes befogadói profiljai
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const records = await prisma.fosterProfile.findMany({
      where:   { userId: session.user.id },
      include: {
        shelter:         { select: { name: true, city: true, slug: true } },
        fosteredAnimals: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('[api/foster GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
