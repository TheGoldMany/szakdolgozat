import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedingScheduleManager } from "@/components/dashboard/feeding-schedule-manager";

export const metadata: Metadata = { title: "Etetési rend" };
export const dynamic = "force-dynamic";

export default async function FeedingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId: string | null = null;

  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
    });
    if (!admin) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          Nincs menhelyhez rendelve fiókod.
        </div>
      );
    }
    shelterId = admin.shelterId;
  } else {
    const first = await prisma.shelter.findFirst({ select: { id: true } });
    shelterId = first?.id ?? null;
  }

  if (!shelterId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
        Nem található menhely.
      </div>
    );
  }

  const rawSchedules = await prisma.feedingSchedule.findMany({
    where: { shelterId },
    orderBy: { createdAt: "asc" },
    include: {
      inventoryItem: {
        select: { name: true, unit: true, quantity: true },
      },
      logs: {
        orderBy: { executedAt: "desc" },
        take: 5,
      },
    },
  });

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { shelterId },
    select: { id: true, name: true, unit: true, quantity: true },
    orderBy: { name: "asc" },
  });

  // Serialise Dates to strings for client components
  const schedules = rawSchedules.map((s) => ({
    ...s,
    quantityPerFeeding: Number(s.quantityPerFeeding),
    nextRunAt: s.nextRunAt.toISOString(),
    lastRunAt: s.lastRunAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    inventoryItem: {
      ...s.inventoryItem,
      quantity: Number(s.inventoryItem.quantity),
    },
    logs: s.logs.map((l) => ({
      ...l,
      quantity: Number(l.quantity),
      executedAt: l.executedAt.toISOString(),
    })),
  }));

  const serialisedInventory = inventoryItems.map((i) => ({
    ...i,
    quantity: Number(i.quantity),
  }));

  return (
    <FeedingScheduleManager
      initialSchedules={schedules}
      inventoryItems={serialisedInventory}
      shelterId={shelterId}
    />
  );
}
