import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TiersManager } from "@/components/dashboard/tiers-manager";

export const metadata: Metadata = { title: "Előfizetési csomagok" };

export default async function TiersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/tiers");
  if (session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  const admin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    select: { shelterId: true },
  });

  if (!admin?.shelterId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm text-gray-500">Nincs hozzárendelt menhely.</p>
      </div>
    );
  }

  const tiers = await prisma.donationTier.findMany({
    where: { shelterId: admin.shelterId },
    include: { _count: { select: { subscriptions: true } } },
    orderBy: { amount: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Előfizetési csomagok</h1>
      <TiersManager tiers={tiers} shelterId={admin.shelterId} />
    </div>
  );
}
