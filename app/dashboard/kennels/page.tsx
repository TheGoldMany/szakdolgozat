import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageInfo } from "@/components/dashboard/page-info";
import { KennelManager } from "@/components/kennel/kennel-manager";

export const metadata: Metadata = { title: "Férőhelyek" };
export const dynamic = "force-dynamic";

export default async function KennelsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard");

  const admin = await prisma.shelterAdmin.findFirst({
    where:  { userId: session.user.id },
    select: { shelterId: true },
  });
  const shelterId = admin?.shelterId;

  if (!shelterId) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
        {t("kennelsNoShelter")}
      </div>
    );
  }

  const [kennels, animals] = await Promise.all([
    prisma.kennel.findMany({
      where:   { shelterId },
      include: { _count: { select: { animals: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Animals physically present at the shelter (not adopted)
    prisma.animal.findMany({
      where:   { shelterId, status: { not: "ADOPTED" } },
      select:  { id: true, name: true, status: true, kennelId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{t("kennelsTitle")}</h1>
        <PageInfo page="kennels" />
      </div>
      <KennelManager initialKennels={kennels} animals={animals} />
    </div>
  );
}
