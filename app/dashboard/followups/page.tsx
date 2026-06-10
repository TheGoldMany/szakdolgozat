import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { ClipboardCheck, Star, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Utánkövetések | Dashboard" };
export const dynamic = "force-dynamic";

const STATUS_COLOR_ICON = {
  COMPLETED: { color: "bg-green-50 text-green-700",  icon: CheckCircle },
  PENDING:   { color: "bg-blue-50  text-blue-700",   icon: Clock },
  OVERDUE:   { color: "bg-red-50   text-red-700",    icon: AlertCircle },
};

function WellbeingStars({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("h-3.5 w-3.5", s <= value ? "fill-amber-400 text-amber-400" : "text-gray-200")}
        />
      ))}
    </span>
  );
}

export default async function FollowUpsAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  const t = await getTranslations("dashboard");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  let shelterId: string | null = null;

  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where:  { userId: session.user.id },
      select: { shelterId: true },
    });
    if (!admin) redirect("/dashboard");
    shelterId = admin.shelterId;
  }

  const now = new Date();

  // Mark overdue
  await prisma.adoptionFollowUp.updateMany({
    where: {
      status:      "PENDING",
      scheduledAt: { lt: now },
      ...(shelterId ? { application: { animal: { shelterId } } } : {}),
    },
    data: { status: "OVERDUE" },
  });

  const followUps = await prisma.adoptionFollowUp.findMany({
    where: shelterId ? { application: { animal: { shelterId } } } : {},
    include: {
      application: {
        select: {
          id:    true,
          user:  { select: { name: true, email: true } },
          animal: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { scheduledAt: "asc" },
    ],
  });

  const stats = {
    total:     followUps.length,
    completed: followUps.filter((f) => f.status === "COMPLETED").length,
    pending:   followUps.filter((f) => f.status === "PENDING").length,
    overdue:   followUps.filter((f) => f.status === "OVERDUE").length,
    avgWellbeing: (() => {
      const rated = followUps.filter((f) => f.wellbeing);
      if (!rated.length) return null;
      return (rated.reduce((s, f) => s + (f.wellbeing ?? 0), 0) / rated.length).toFixed(1);
    })(),
  };

  const STATUS_LABEL: Record<string, string> = {
    COMPLETED: t("followupsStatusCompleted"),
    PENDING:   t("followupsStatusPending"),
    OVERDUE:   t("followupsStatusOverdue"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="h-6 w-6 text-brand-500" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900">{t("followupsPageTitle")}</h1>
            <PageInfo page="followups" />
          </div>
          <p className="text-sm text-gray-500">{t("followupsSubtitle")}</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t("followupsKpiTotal"),     value: stats.total,     color: "text-gray-700" },
          { label: t("followupsKpiCompleted"), value: stats.completed, color: "text-green-600" },
          { label: t("followupsKpiPending"),   value: stats.pending,   color: "text-blue-600" },
          { label: t("followupsKpiOverdue"),   value: stats.overdue,   color: "text-red-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Avg wellbeing */}
      {stats.avgWellbeing && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium text-amber-800">
            {t("followupsAvgWellbeing", { value: stats.avgWellbeing })}
          </span>
        </div>
      )}

      {/* Table */}
      {followUps.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">{t("followupsEmpty")}</p>
          <p className="mt-1 text-sm text-gray-400">{t("followupsEmptyDesc")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 text-left">{t("followupsColAnimal")}</th>
                <th className="px-4 py-3 text-left">{t("followupsColAdopter")}</th>
                <th className="px-4 py-3 text-left">{t("followupsColDeadline")}</th>
                <th className="px-4 py-3 text-left">{t("followupsColStatus")}</th>
                <th className="px-4 py-3 text-left">{t("followupsColRating")}</th>
                <th className="px-4 py-3 text-left">{t("followupsColNote")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {followUps.map((f) => {
                const cfg = STATUS_COLOR_ICON[f.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {f.application.animal.name}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{f.application.user.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{f.application.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(f.scheduledAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <WellbeingStars value={f.wellbeing} />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-500 truncate">
                      {f.notes ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
