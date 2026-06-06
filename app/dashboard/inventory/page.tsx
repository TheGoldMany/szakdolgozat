import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Package, AlertTriangle, Clock, Tag, Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/dashboard/stats/kpi-card";
import { InventoryList } from "@/components/inventory/inventory-list";

export const metadata: Metadata = { title: "Készlet" };
export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  FOOD:      "Takarmány",
  MEDICINE:  "Gyógyszer",
  SUPPLIES:  "Kellékek",
  CLEANING:  "Tisztítószer",
  EQUIPMENT: "Eszköz",
  OTHER:     "Egyéb",
};

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterIds: string[];
  let shelterId: string | null = null;

  if (isSuperAdmin) {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    shelterIds = all.map((s) => s.id);
  } else {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
    });
    if (!admin) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
          Még nincs menhelyhez rendelve a fiókod.
        </div>
      );
    }
    shelterId  = admin.shelterId;
    shelterIds = [shelterId];
  }

  const now   = new Date();
  const in7d  = new Date(now.getTime() + 7 * 86_400_000);

  const items = await prisma.inventoryItem.findMany({
    where:   { shelterId: { in: shelterIds } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const totalItems    = items.length;
  const lowStockItems = items.filter(
    (i) => i.minQuantity !== null && i.quantity < i.minQuantity
  );
  const expiringItems = items.filter(
    (i) => i.expiresAt !== null && i.expiresAt <= in7d && i.expiresAt >= now
  );
  const expiredItems  = items.filter(
    (i) => i.expiresAt !== null && i.expiresAt < now
  );

  // Category breakdown for KPI
  const byCat: Record<string, number> = {};
  for (const item of items) {
    byCat[item.category] = (byCat[item.category] ?? 0) + 1;
  }
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  // Serialise for client
  const serialisedItems = items.map((i) => ({
    ...i,
    quantity:    Number(i.quantity),
    minQuantity: i.minQuantity !== null ? Number(i.minQuantity) : null,
    expiresAt:   i.expiresAt?.toISOString() ?? null,
    createdAt:   i.createdAt.toISOString(),
    updatedAt:   i.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Készlet</h1>
        <Link
          href={`/dashboard/inventory/new${shelterId ? `?shelterId=${shelterId}` : ""}`}
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Új tétel
        </Link>
      </div>

      {/* KPI-k */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Összes tétel"
          value={totalItems}
          icon={Package}
          iconBg="bg-brand-50"
          iconColor="text-brand-500"
        />
        <KpiCard
          label="Alacsony készlet"
          value={lowStockItems.length}
          icon={AlertTriangle}
          iconBg={lowStockItems.length > 0 ? "bg-red-50" : "bg-gray-50"}
          iconColor={lowStockItems.length > 0 ? "text-red-500" : "text-gray-400"}
        />
        <KpiCard
          label="Hamarosan lejár (7 nap)"
          value={expiringItems.length + expiredItems.length}
          icon={Clock}
          iconBg={(expiringItems.length + expiredItems.length) > 0 ? "bg-amber-50" : "bg-gray-50"}
          iconColor={(expiringItems.length + expiredItems.length) > 0 ? "text-amber-500" : "text-gray-400"}
        />
        <KpiCard
          label={topCat ? CATEGORY_LABELS[topCat[0]] ?? topCat[0] : "Kategória"}
          value={topCat ? topCat[1] : 0}
          icon={Tag}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
        />
      </div>

      {/* Lista */}
      <InventoryList
        items={serialisedItems}
        shelterId={shelterId}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
