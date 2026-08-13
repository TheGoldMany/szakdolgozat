import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, HandHeart, FileText, CheckCircle2 } from "lucide-react";
import { CampaignApprovals } from "@/components/dashboard/campaign-approvals";
import { FormApprovalActions } from "@/components/dashboard/form-approval-actions";
import { ShelterApprovals } from "@/components/dashboard/shelter-approvals";

export const metadata: Metadata = { title: "Jóváhagyások" };
export const dynamic = "force-dynamic";

function SectionHeader({
  icon: Icon, title, count,
}: {
  icon: typeof Building2; title: string; count: number;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50">
        <Icon className="h-4 w-4 text-amber-600" />
      </span>
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {count > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{count}</span>
      )}
    </div>
  );
}

/**
 * Egységes jóváhagyási központ super adminnak: menhely-hitelesítés,
 * gyűjtés- és kérvényűrlap-jóváhagyás egy helyen. Az értesítések ide mutatnak.
 */
export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/approvals");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [pendingShelters, pendingCampaigns, pendingForms] = await Promise.all([
    prisma.shelter.findMany({
      where:   { isActive: true, isVerified: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, city: true,
        address: true, email: true, phone: true, createdAt: true,
      },
    }),
    prisma.campaign.findMany({
      where:   { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        user:    { select: { name: true, email: true } },
        shelter: { select: { name: true } },
      },
    }),
    prisma.applicationForm.findMany({
      where:   { status: "PENDING_APPROVAL" },
      orderBy: { createdAt: "desc" },
      include: { shelter: { select: { name: true } }, _count: { select: { fields: true } } },
    }),
  ]);

  const total = pendingShelters.length + pendingCampaigns.length + pendingForms.length;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Jóváhagyások</h1>
          {total > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-700">{total}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Minden jóváhagyásra váró tétel egy helyen.
        </p>
      </div>

      {total === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-100 bg-green-50 py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-medium text-green-800">Nincs jóváhagyásra váró tétel.</p>
          <p className="text-sm text-green-700/70">Minden kérelmet elbíráltál.</p>
        </div>
      )}

      {/* Menhelyek */}
      {pendingShelters.length > 0 && (
        <section>
          <SectionHeader icon={Building2} title="Hitelesítésre váró menhelyek" count={pendingShelters.length} />
          <ShelterApprovals
            shelters={pendingShelters.map((s) => ({
              ...s,
              createdAt: s.createdAt.toISOString(),
            }))}
          />
        </section>
      )}

      {/* Gyűjtések */}
      {pendingCampaigns.length > 0 && (
        <section>
          <SectionHeader icon={HandHeart} title="Jóváhagyásra váró gyűjtések" count={pendingCampaigns.length} />
          <CampaignApprovals
            campaigns={pendingCampaigns.map((c) => ({
              id:           c.id,
              title:        c.title,
              description:  c.description,
              targetAmount: c.targetAmount,
              createdAt:    c.createdAt.toISOString(),
              user:         c.user,
              shelter:      c.shelter,
            }))}
          />
        </section>
      )}

      {/* Kérvényűrlapok */}
      {pendingForms.length > 0 && (
        <section>
          <SectionHeader icon={FileText} title="Jóváhagyásra váró kérvényűrlapok" count={pendingForms.length} />
          <div className="space-y-3">
            {pendingForms.map((form) => (
              <div key={form.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{form.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {form.shelter.name} · {form._count.fields} kérdés
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      Beküldve: {new Date(form.createdAt).toLocaleDateString("hu-HU")}
                    </p>
                  </div>
                  <FormApprovalActions formId={form.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
