import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateNextRunAt } from "@/lib/feeding-utils";
import { FeedingFrequency } from "@prisma/client";

/**
 * POST /api/cron/feeding
 *
 * Vercel Cron Job által hívott endpoint.
 * Hitelesítés: Authorization: Bearer {CRON_SECRET} header.
 *
 * Minden aktív FeedingSchedule-ra ahol nextRunAt <= now:
 *  1. Levonja a quantityPerFeeding-et az InventoryItem.quantity-ból
 *  2. Létrehoz InventoryTransaction (type: OUT)
 *  3. Létrehoz FeedingLog (skipped: false, txId: tranzakció id)
 *  4. Ha nincs elég készlet: csak FeedingLog (skipped: true)
 *  5. Frissíti FeedingSchedule.lastRunAt és nextRunAt
 *
 * Visszatér: { processed: N, skipped: M }
 */
export async function POST(req: NextRequest) {
  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET nincs konfigurálva." },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --------------------------------------------------------------------------
  // Find all due active schedules
  // --------------------------------------------------------------------------
  const now = new Date();

  const dueSchedules = await prisma.feedingSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
    include: {
      inventoryItem: {
        select: { id: true, name: true, unit: true, quantity: true },
      },
    },
  });

  if (dueSchedules.length === 0) {
    return NextResponse.json({ processed: 0, skipped: 0 });
  }

  let processed = 0;
  let skipped = 0;

  // --------------------------------------------------------------------------
  // Process each schedule in its own interactive transaction
  // --------------------------------------------------------------------------
  for (const schedule of dueSchedules) {
    const { inventoryItem } = schedule;

    const nextRunAt = calculateNextRunAt({
      times: schedule.times,
      frequency: schedule.frequency as FeedingFrequency,
      weekDays: schedule.weekDays,
      from: now,
    });

    if (inventoryItem.quantity >= schedule.quantityPerFeeding) {
      // Happy path: deduct inventory, create transaction record + log atomically
      await prisma.$transaction(async (tx) => {
        // 1. Deduct from inventory
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: { decrement: schedule.quantityPerFeeding } },
        });

        // 2. Create InventoryTransaction (OUT, negative delta)
        const inventoryTx = await tx.inventoryTransaction.create({
          data: {
            itemId: inventoryItem.id,
            type: "OUT",
            quantity: -schedule.quantityPerFeeding,
            note: `Automatikus etetés: ${schedule.name}`,
          },
        });

        // 3. Create FeedingLog with txId reference
        await tx.feedingLog.create({
          data: {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            itemName: inventoryItem.name,
            unit: inventoryItem.unit,
            quantity: schedule.quantityPerFeeding,
            executedAt: now,
            skipped: false,
            txId: inventoryTx.id,
          },
        });

        // 4. Update schedule timestamps
        await tx.feedingSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now, nextRunAt },
        });
      });

      processed++;
    } else {
      // Insufficient stock: skip – still advance the schedule clock
      const available = inventoryItem.quantity;
      const skipReason = `Nincs elegendő készlet: ${available} ${inventoryItem.unit}`;

      await prisma.$transaction([
        prisma.feedingLog.create({
          data: {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            itemName: inventoryItem.name,
            unit: inventoryItem.unit,
            quantity: schedule.quantityPerFeeding,
            executedAt: now,
            skipped: true,
            skipReason,
          },
        }),

        prisma.feedingSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now, nextRunAt },
        }),
      ]);

      skipped++;
    }
  }

  return NextResponse.json({ processed, skipped });
}
