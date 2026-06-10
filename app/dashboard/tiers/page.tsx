import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { TiersManager } from "@/components/dashboard/tiers-manager";

export const metadata: Metadata = { title: "Előfizetési csomagok" };

export default async function TiersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/tiers");
  if (session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  const t = await getTranslations("dashboard");

  const admin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    select: { shelterId: true },
  });

  if (!admin?.shelterId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm text-gray-500">{t("tiersNoShelter")}</p>
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
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{t("tiersTitle")}</h1>
        <PageInfo page="tiers" />
      </div>
      <TiersManager tiers={tiers} shelterId={admin.shelterId} />
    </div>
  );
}
