import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedingFrequency } from "@prisma/client";
import { calculateNextRunAt } from "@/lib/feeding-utils";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().min(1).max(200),
  inventoryItemId: z.string().min(1),
  quantityPerFeeding: z.number().positive(),
  frequency: z.nativeEnum(FeedingFrequency),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  weekDays: z.array(z.number().int().min(0).max(6)).optional(),
  note: z.string().max(2000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function authorizeForShelter(
  userId: string,
  role: string,
  shelterId: string
): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;
  if (role !== "SHELTER_ADMIN") return false;
  const admin = await prisma.shelterAdmin.findFirst({
    where: { userId, shelterId },
    select: { id: true },
  });
  return !!admin;
}

// ---------------------------------------------------------------------------
// GET /api/shelters/[id]/feeding-schedules
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const shelterId = params.id;
  const allowed = await authorizeForShelter(session.user.id, session.user.role, shelterId);
  if (!allowed) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const schedules = await prisma.feedingSchedule.findMany({
    where: { shelterId },
    include: {
      inventoryItem: {
        select: { name: true, unit: true, quantity: true },
      },
      logs: {
        orderBy: { executedAt: "desc" },
        take: 5,
      },
    },
    orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
  });

  return NextResponse.json(schedules);
}

// ---------------------------------------------------------------------------
// POST /api/shelters/[id]/feeding-schedules
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const shelterId = params.id;
  const allowed = await authorizeForShelter(session.user.id, session.user.role, shelterId);
  if (!allowed) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    name,
    inventoryItemId,
    quantityPerFeeding,
    frequency,
    times,
    weekDays = [],
    note,
  } = parsed.data;

  // Validate that the inventory item belongs to this shelter
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { id: inventoryItemId, shelterId },
    select: { id: true },
  });
  if (!inventoryItem) {
    return NextResponse.json(
      { error: "A megadott készletelem nem tartozik ehhez a menhelyhez." },
      { status: 400 }
    );
  }

  const nextRunAt = calculateNextRunAt({ times, frequency, weekDays });

  const schedule = await prisma.feedingSchedule.create({
    data: {
      shelterId,
      name,
      inventoryItemId,
      quantityPerFeeding,
      frequency,
      times,
      weekDays,
      isActive: true,
      nextRunAt,
      note: note ?? null,
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
