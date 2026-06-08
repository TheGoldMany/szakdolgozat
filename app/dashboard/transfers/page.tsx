import { redirect } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageInfo } from "@/components/dashboard/page-info";
import { TransfersManager } from "@/components/transfers/transfers-manager";
import type { TransferEntry } from "@/components/transfers/transfers-manager";

export const metadata: Metadata = { title: "Áthelyezések" };
export const dynamic = "force-dynamic";

export default async function DashboardTransfersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  let shelterIds: string[];
  if (session.user.role === "SUPER_ADMIN") {
    const all = await prisma.shelter.findMany({ select: { id: true } });
    shelterIds = all.map(s => s.id);
  } else {
    const admins = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id }, select: { shelterId: true },
    });
    shelterIds = admins.map(a => a.shelterId);
    if (shelterIds.length === 0) redirect("/dashboard");
  }

  const currentShelterId = shelterIds[0];

  const transfers = await prisma.animalTransfer.findMany({
    where: {
      OR: [
        { fromShelterId: { in: shelterIds } },
        { toShelterId:   { in: shelterIds } },
      ],
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
    include: {
      animal: {
        select: {
          id: true, name: true, slug: true, type: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
      fromShelter: { select: { id: true, name: true } },
      toShelter:   { select: { id: true, name: true } },
      requestedBy: { select: { name: true } },
      resolvedBy:  { select: { name: true } },
    },
  });

  const serialized: TransferEntry[] = transfers.map(t => ({
    id:          t.id,
    status:      t.status,
    note:        t.note,
    requestedAt: t.requestedAt.toISOString(),
    resolvedAt:  t.resolvedAt?.toISOString() ?? null,
    animal: {
      id:     t.animal.id,
      name:   t.animal.name,
      slug:   t.animal.slug,
      type:   t.animal.type,
      images: t.animal.images,
    },
    fromShelter: t.fromShelter,
    toShelter:   t.toShelter,
    requestedBy: t.requestedBy,
    resolvedBy:  t.resolvedBy,
  }));

  const pending = transfers.filter(t => t.status === "PENDING").length;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ArrowRightLeft className="h-6 w-6 text-brand-500" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Áthelyezések</h1>
            <PageInfo page="transfers" />
          </div>
          <p className="text-sm text-gray-500">
            {transfers.length} kérelem összesen
            {pending > 0 && <span className="ml-1 font-semibold text-yellow-700">&bull; {pending} várakozó</span>}
          </p>
        </div>
      </div>

      <TransfersManager
        initialTransfers={serialized}
        currentShelterId={currentShelterId}
      />
    </div>
  );
}
