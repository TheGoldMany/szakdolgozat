import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignApprovals } from "@/components/dashboard/campaign-approvals";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gyűjtések jóváhagyása" };

export default async function CampaignApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/campaigns");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const pending = await prisma.campaign.findMany({
    where: { status: "PENDING" },
    include: {
      user:    { select: { name: true, email: true } },
      shelter: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Gyűjtések jóváhagyása</h1>
      <CampaignApprovals
        campaigns={pending.map((c) => ({
          id:           c.id,
          title:        c.title,
          description:  c.description,
          targetAmount: c.targetAmount,
          createdAt:    c.createdAt.toISOString(),
          user:         c.user,
          shelter:      c.shelter,
        }))}
      />
    </div>
  );
}
