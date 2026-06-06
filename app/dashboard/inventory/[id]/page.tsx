import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryItemDetail } from "@/components/inventory/inventory-item-detail";

export const metadata: Metadata = { title: "Készlettétel" };
export const dynamic = "force-dynamic";

export default async function InventoryItemPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const item = await prisma.inventoryItem.findUnique({
    where: { id: params.id },
    include: {
      shelter: { select: { name: true } },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });

  if (!item) notFound();

  // Access check
  if (session.user.role !== "SUPER_ADMIN") {
    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: item.shelterId },
    });
    if (!isAdmin) notFound();
  }

  const serialised = {
    id:          item.id,
    shelterId:   item.shelterId,
    shelterName: item.shelter.name,
    name:        item.name,
    category:    item.category,
    unit:        item.unit,
    quantity:    Number(item.quantity),
    minQuantity: item.minQuantity !== null ? Number(item.minQuantity) : null,
    expiresAt:   item.expiresAt?.toISOString() ?? null,
    note:        item.note,
    createdAt:   item.createdAt.toISOString(),
    updatedAt:   item.updatedAt.toISOString(),
    transactions: item.transactions.map((t) => ({
      id:          t.id,
      type:        t.type,
      quantity:    Number(t.quantity),
      note:        t.note,
      createdBy:   t.createdBy,
      createdAt:   t.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Vissza a készlethez
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
          <Package className="h-5 w-5 text-brand-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
          <p className="text-xs text-gray-400">{item.shelter.name}</p>
        </div>
      </div>

      <InventoryItemDetail item={serialised} />
    </div>
  );
}
