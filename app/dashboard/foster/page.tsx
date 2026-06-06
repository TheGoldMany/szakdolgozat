import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageInfo } from "@/components/dashboard/page-info";
import { FosterAdmin } from "@/components/foster/foster-admin";

export const metadata: Metadata = { title: "Ideiglenes befogadók" };
export const dynamic = "force-dynamic";

export default async function FosterDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    shelterId = admin?.shelterId;
  }

  if (!isSuperAdmin && !shelterId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
        A fiókod nincs menhelyhez rendelve.
      </div>
    );
  }

  const [fosters, inventory] = await Promise.all([
    prisma.fosterProfile.findMany({
      where: shelterId ? { shelterId } : {},
      include: {
        user:            { select: { name: true, email: true } },
        fosteredAnimals: { select: { id: true, name: true, slug: true } },
        supplyLogs:      {
          include: { item: { select: { name: true, unit: true } } },
          orderBy: { createdAt: "desc" },
          take:    10,
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.inventoryItem.findMany({
      where:  shelterId ? { shelterId } : {},
      select: { id: true, name: true, unit: true, quantity: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = fosters.map(f => ({
    ...f,
    createdAt:  f.createdAt.toISOString(),
    updatedAt:  f.updatedAt.toISOString(),
    supplyLogs: f.supplyLogs.map(l => ({
      id: l.id, quantity: l.quantity, note: l.note,
      createdAt: l.createdAt.toISOString(), item: l.item,
    })),
  }));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Ideiglenes befogadók</h1>
        <PageInfo page="foster" />
      </div>
      <FosterAdmin initialFosters={serialized} inventory={inventory} />
    </div>
  );
}
