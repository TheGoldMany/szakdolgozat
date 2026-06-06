import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { CampaignApprovals } from "@/components/dashboard/campaign-approvals";
import { FormApprovalActions } from "@/components/dashboard/form-approval-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Jóváhagyások" };

export default async function CampaignApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/campaigns");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [pending, pendingForms] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "PENDING" },
      include: {
        user:    { select: { name: true, email: true } },
        shelter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.applicationForm.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: {
        shelter: { select: { name: true } },
        _count:  { select: { fields: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Jóváhagyások</h1>
        <PageInfo page="campaigns" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Gyűjtések</h2>
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

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-700">Kérvény sablonok</h2>
        {pendingForms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">Nincs jóváhagyásra váró kérvény sablon.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingForms.map((form) => (
              <div
                key={form.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{form.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.shelter.name} · {form._count.fields} mező
                    </p>
                    {form.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{form.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      Beküldve: {new Date(form.createdAt).toLocaleDateString("hu-HU")}
                    </p>
                  </div>
                </div>
                <FormApprovalActions formId={form.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
