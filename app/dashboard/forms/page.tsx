import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveActingShelter } from "@/lib/acting-shelter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kérvény sablonok" };

const STATUS_CLASSES: Record<string, string> = {
  DRAFT:            "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED:         "bg-green-100 text-green-700",
  REJECTED:         "bg-red-100 text-red-600",
};

export default async function FormsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/forms");
  if (session.user.role !== "SHELTER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const t = await getTranslations("dashboard");

  const STATUS_LABELS: Record<string, string> = {
    DRAFT:            t("formsStatusDraft"),
    PENDING_APPROVAL: t("formsStatusPendingApproval"),
    APPROVED:         t("formsStatusApproved"),
    REJECTED:         t("formsStatusRejected"),
  };

  const acting    = await resolveActingShelter(session.user.id, session.user.role);
  const shelterId = acting.shelterId;

  // A sablonkezelés mindig egy konkrét menhelyhez kötött
  if (!shelterId) {
    if (!acting.canSwitch) redirect("/dashboard");
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
        Válassz menhelyt a bal oldali „Kezelt menhely” választóval a kérvény sablonok kezeléséhez.
      </div>
    );
  }

  const forms = await prisma.applicationForm.findMany({
    where: { shelterId },
    include: { _count: { select: { fields: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{t("formsPageTitle")}</h1>
          <PageInfo page="forms" />
        </div>
        <Link
          href="/dashboard/forms/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("formsNewBtn")}
        </Link>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">{t("formsEmpty")}</p>
          <Link
            href="/dashboard/forms/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("formsCreateFirst")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form) => (
            <div
              key={form.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 truncate">{form.title}</p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_CLASSES[form.status] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {STATUS_LABELS[form.status] ?? form.status}
                  </span>
                </div>
                {form.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-1">{form.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">{t("formsFieldCount", { count: form._count.fields })}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/dashboard/forms/${form.id}`}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t("formsEdit")}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
