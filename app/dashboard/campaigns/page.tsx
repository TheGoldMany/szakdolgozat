import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { CampaignAdminActions } from "@/components/dashboard/campaign-admin-actions";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { CampaignStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gyűjtések" };

const STATUS_LABELS: Record<CampaignStatus | "ALL", string> = {
  ALL:       "Összes",
  PENDING:   "Jóváhagyásra vár",
  ACTIVE:    "Aktív",
  COMPLETED: "Befejezett",
  REJECTED:  "Visszautasított",
};

const STATUS_BADGE: Record<CampaignStatus, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  ACTIVE:    "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  REJECTED:  "bg-red-100 text-red-600",
};

function formatHUF(n: number) {
  return new Intl.NumberFormat("hu-HU").format(n) + " Ft";
}

interface PageProps { searchParams: { status?: string } }

export default async function CampaignApprovalsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/dashboard/campaigns");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin && session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  // Menhely admin csak a saját menhelye gyűjtéseit látja
  let shelterId: string | null = null;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    if (!admin) redirect("/dashboard");
    shelterId = admin.shelterId;
  }

  const validStatuses: CampaignStatus[] = ["PENDING", "ACTIVE", "COMPLETED", "REJECTED"];
  const statusFilter = validStatuses.includes(searchParams.status as CampaignStatus)
    ? (searchParams.status as CampaignStatus)
    : null;

  const allCampaigns = await prisma.campaign.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(shelterId ? { shelterId } : {}),
    },
    include: {
      user:    { select: { name: true, email: true } },
      shelter: { select: { name: true } },
      // A szerkesztéshez szükséges mezőket (description, imageUrl, endsAt) az
      // include már visszaadja; az adományszám dönti el, törölhető-e a gyűjtés.
      _count:  { select: { donations: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Gyűjtések</h1>
        <PageInfo page="campaigns" />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...validStatuses] as const).map((s) => {
          const href = s === "ALL" ? "/dashboard/campaigns" : `/dashboard/campaigns?status=${s}`;
          const active = s === "ALL" ? !statusFilter : statusFilter === s;
          return (
            <Link
              key={s}
              href={href}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              {STATUS_LABELS[s]}
            </Link>
          );
        })}
      </div>

      {/* All campaigns table */}
      <div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {allCampaigns.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400">Nincs ilyen gyűjtés.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Gyűjtés</th>
                    <th className="px-4 py-3 text-left">Menhely</th>
                    <th className="px-4 py-3 text-left">Cél / Összegyűlt</th>
                    <th className="px-4 py-3 text-left">Státusz</th>
                    <th className="px-4 py-3 text-left">Létrehozva</th>
                    {isSuperAdmin && <th className="px-4 py-3 text-left">Műveletek</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/donate/${c.id}`}
                          className="font-medium text-gray-900 hover:text-brand-600 line-clamp-1"
                        >
                          {c.title}
                        </Link>
                        <p className="text-xs text-gray-400 truncate">
                          {c.user?.name ?? c.user?.email ?? "–"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.shelter?.name ?? "–"}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="font-medium text-brand-600">{formatHUF(c.raisedAmount)}</span>
                        <span className="text-gray-400"> / {formatHUF(c.targetAmount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_BADGE[c.status])}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      {isSuperAdmin && (
                        <td className="px-4 py-3">
                          <CampaignAdminActions
                            campaign={{
                              id:           c.id,
                              title:        c.title,
                              description:  c.description,
                              targetAmount: c.targetAmount,
                              imageUrl:     c.imageUrl,
                              endsAt:       c.endsAt,
                              status:       c.status,
                            }}
                            hasDonations={c._count.donations > 0}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* A jóváhagyás a dedikált Jóváhagyások oldalon történik */}
      {isSuperAdmin && (
        <Link
          href="/dashboard/approvals"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:underline"
        >
          Jóváhagyásra váró tételek →
        </Link>
      )}
    </div>
  );
}
