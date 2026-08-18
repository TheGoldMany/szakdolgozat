import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WithdrawButton } from "@/components/applications/withdraw-button";
import { RatingStat } from "@/components/reviews/rating-stat";
import { ApplicationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { ClipboardList, FileText, Clock } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("applications");
  return { title: t("title") };
}

export default async function ApplicationsPage() {
  const t = await getTranslations("applications");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/applications");
  }

  const applications = await prisma.adoptionApplication.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      animal: {
        include: {
          images:  { where: { isPrimary: true }, take: 1 },
          shelter: { select: { id: true, name: true, city: true } },
        },
      },
      _count: { select: { responses: true } },
    },
  });

  // Menhelyek értékelései egy kötegelt lekérdezéssel (N+1 elkerülése)
  const shelterIds = [...new Set(applications.map((a) => a.animal.shelter.id))];
  const ratingRows = shelterIds.length
    ? await prisma.review.groupBy({
        by:     ["shelterId"],
        where:  { shelterId: { in: shelterIds } },
        _avg:   { rating: true },
        _count: { rating: true },
      })
    : [];
  const ratingMap = new Map(
    ratingRows.map((r) => [r.shelterId, { avg: r._avg.rating, count: r._count.rating }])
  );

  const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
    INVITED:   { label: t("statusInvited"),   color: "bg-purple-100 text-purple-700" },
    PENDING:   { label: t("statusPending"),   color: "bg-yellow-100 text-yellow-700" },
    REVIEWING: { label: t("statusReviewing"), color: "bg-blue-100 text-blue-700"    },
    APPROVED:  { label: t("statusApproved"),  color: "bg-green-100 text-green-700"  },
    REJECTED:  { label: t("statusRejected"),  color: "bg-red-100 text-red-700"      },
    WITHDRAWN: { label: t("statusWithdrawn"), color: "bg-gray-100 text-gray-500"    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl text-gray-900">{t("title")}</h1>
          <p className="mt-2 text-gray-500">
            {applications.length === 0
              ? t("noneFirst")
              : t("total", { count: applications.length })}
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <ClipboardList className="h-14 w-14 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-700">{t("none")}</p>
            <p className="mt-1 text-sm text-gray-400">{t("noneDesc")}</p>
            <Link
              href="/animals"
              className="mt-5 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {t("browseAnimals")}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const status      = STATUS_LABELS[app.status];
              const imgUrl      = app.animal.images[0]?.url ?? "/placeholder-animal.jpg";
              const hasForm     = !!app.formId;
              const formFilled  = app._count.responses > 0;
              const showInvite  = app.status === ApplicationStatus.INVITED && hasForm && !formFilled;

              return (
                <div
                  key={app.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="flex gap-4 p-4">
                    <Link href={`/animals/${app.animal.slug}`} className="shrink-0">
                      <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
                        <Image
                          src={imgUrl}
                          alt={app.animal.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/animals/${app.animal.slug}`}
                            className="font-semibold text-gray-900 hover:text-brand-500 transition-colors"
                          >
                            {app.animal.name}
                          </Link>
                          <p className="truncate text-xs text-gray-400">
                            {app.animal.shelter.city} · {app.animal.shelter.name}
                          </p>
                          <RatingStat
                            avg={ratingMap.get(app.animal.shelter.id)?.avg ?? null}
                            count={ratingMap.get(app.animal.shelter.id)?.count ?? 0}
                            hideWhenEmpty
                            className="mt-0.5"
                          />
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(app.createdAt).toLocaleDateString("hu-HU", {
                            year: "numeric", month: "long", day: "numeric",
                          })}
                        </span>
                        {app.status === ApplicationStatus.PENDING && !hasForm && (
                          <WithdrawButton applicationId={app.id} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form banner */}
                  {hasForm && (
                    <div className={cn(
                      "border-t px-4 py-3 flex items-center gap-3 text-sm",
                      showInvite
                        ? "border-purple-100 bg-purple-50"
                        : formFilled
                          ? "border-brand-100 bg-brand-50"
                          : "border-yellow-100 bg-yellow-50"
                    )}>
                      {showInvite ? (
                        <>
                          <ClipboardList className="h-4 w-4 shrink-0 text-purple-500" />
                          <span className="flex-1 text-purple-700 font-medium">{t("formRequestedBanner")}</span>
                          <Link
                            href={`/apply/${app.inviteToken}`}
                            className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 transition-colors"
                          >
                            {t("fillForm")}
                          </Link>
                        </>
                      ) : formFilled ? (
                        <>
                          <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                          <span className="flex-1 text-brand-700 font-medium">{t("formSubmittedBanner")}</span>
                          <Link
                            href={`/applications/${app.id}`}
                            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
                          >
                            {t("view")}
                          </Link>
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 shrink-0 text-yellow-600" />
                          <span className="text-yellow-700">{t("formInProgressBanner")}</span>
                        </>
                      )}
                    </div>
                  )}

                  {(app.message || app.reviewNotes) && !hasForm && (
                    <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
                      {app.message && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-600">{t("motivation")} </span>
                          {app.message}
                        </p>
                      )}
                      {app.reviewNotes && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-600">{t("shelterNote")} </span>
                          {app.reviewNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {app.reviewNotes && hasForm && (
                    <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                      <p className="line-clamp-2">
                        <span className="font-medium text-gray-600">{t("shelterNote")} </span>
                        {app.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
