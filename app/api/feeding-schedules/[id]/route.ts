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

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  inventoryItemId: z.string().min(1).optional(),
  quantityPerFeeding: z.number().positive().optional(),
  frequency: z.nativeEnum(FeedingFrequency).optional(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).optional(),
  weekDays: z.array(z.number().int().min(0).max(6)).optional(),
  isActive: z.boolean().optional(),
  note: z.string().max(2000).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Auth helper – verifies that the schedule belongs to one of the user's shelters
// ---------------------------------------------------------------------------

async function authorizeForSchedule(
  userId: string,
  role: string,
  scheduleId: string
): Promise<{
  ok: boolean;
  schedule: { id: string; shelterId: string; times: string[]; frequency: FeedingFrequency; weekDays: number[] } | null;
}> {
  const schedule = await prisma.feedingSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, shelterId: true, times: true, frequency: true, weekDays: true },
  });
  if (!schedule) return { ok: false, schedule: null };
  if (role === "SUPER_ADMIN") return { ok: true, schedule };
  if (role !== "SHELTER_ADMIN") return { ok: false, schedule: null };
  const admin = await prisma.shelterAdmin.findFirst({
    where: { userId, shelterId: schedule.shelterId },
    select: { id: true },
  });
  return { ok: !!admin, schedule };
}

// ---------------------------------------------------------------------------
// PATCH /api/feeding-schedules/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const { ok, schedule } = await authorizeForSchedule(
    session.user.id,
    session.user.role,
    params.id
  );
  if (!ok || !schedule) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate inventoryItemId belongs to same shelter (if being changed)
  if (data.inventoryItemId !== undefined) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: data.inventoryItemId, shelterId: schedule.shelterId },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json(
        { error: "A megadott készletelem nem tartozik ehhez a menhelyhez." },
        { status: 400 }
      );
    }
  }

  // Recalculate nextRunAt when times/frequency changed, or when reactivating
  const timesChanged = data.times !== undefined;
  const frequencyChanged = data.frequency !== undefined;
  const weekDaysChanged = data.weekDays !== undefined;
  const reactivating = data.isActive === true;

  let nextRunAt: Date | undefined;
  if (timesChanged || frequencyChanged || weekDaysChanged || reactivating) {
    nextRunAt = calculateNextRunAt({
      times: data.times ?? schedule.times,
      frequency: data.frequency ?? schedule.frequency,
      weekDays: data.weekDays ?? schedule.weekDays,
    });
  }

  const updated = await prisma.feedingSchedule.update({
    where: { id: params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.inventoryItemId !== undefined && { inventoryItemId: data.inventoryItemId }),
      ...(data.quantityPerFeeding !== undefined && { quantityPerFeeding: data.quantityPerFeeding }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
      ...(data.times !== undefined && { times: data.times }),
      ...(data.weekDays !== undefined && { weekDays: data.weekDays }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.note !== undefined && { note: data.note }),
      ...(nextRunAt !== undefined && { nextRunAt }),
    },
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/feeding-schedules/[id]
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const { ok } = await authorizeForSchedule(
    session.user.id,
    session.user.role,
    params.id
  );
  if (!ok) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  await prisma.feedingSchedule.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
