import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationReview } from "@/components/dashboard/application-review";
import { ContractDownloadButton } from "@/components/applications/contract-download-button";
import { RatingBadge } from "@/components/reviews/rating-stat";
import { detectConflicts } from "@/lib/behavior";
import { cn } from "@/lib/utils";
import { ArrowLeft, FileText, Users, PawPrint, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Kérelem részletei" };

function isImage(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const t = await getTranslations("dashboard");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    INVITED:   { label: t("appsStatusLabelInvited"),   color: "bg-purple-100 text-purple-700" },
    PENDING:   { label: t("appsStatusLabelPending"),   color: "bg-yellow-100 text-yellow-700" },
    REVIEWING: { label: t("appsStatusLabelReviewing"), color: "bg-blue-100 text-blue-700" },
    APPROVED:  { label: t("appsStatusLabelApproved"),  color: "bg-green-100 text-green-700" },
    REJECTED:  { label: t("appsStatusLabelRejected"),  color: "bg-red-100 text-red-700" },
    WITHDRAWN: { label: t("appsStatusLabelWithdrawn"), color: "bg-gray-100 text-gray-500" },
  };

  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
    });
    shelterId = admin?.shelterId;
  }

  const app = await prisma.adoptionApplication.findUnique({
    where: { id: params.id },
    include: {
      user:   { select: { name: true, email: true, phone: true } },
      animal: {
        include: {
          images:  { where: { isPrimary: true }, take: 1 },
          shelter: { select: { id: true, name: true } },
        },
      },
      form: { select: { title: true } },
      responses: {
        include: { field: true },
        orderBy: { field: { order: "asc" } },
      },
    },
  });

  if (!app) notFound();

  // Ensure shelter admin can only see their own shelter's applications
  if (!isSuperAdmin && shelterId && app.animal.shelter.id !== shelterId) {
    notFound();
  }

  const status = STATUS_LABELS[app.status] ?? { label: app.status, color: "bg-gray-100 text-gray-500" };
  const imgUrl = app.animal.images[0]?.url ?? "/placeholder-animal.jpg";

  // Viselkedési ütközések ellenőrzése (belső flag-ek vs. jelentkező válaszai)
  const conflicts = detectConflicts(app.animal.flags, {
    hasChildren: app.hasChildren,
    hasPets:     app.hasPets,
    homeType:    app.homeType,
    hasGarden:   app.hasGarden,
    experience:  app.experience,
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("appDetailBack")}
      </Link>

      {/* Viselkedési ütközés figyelmeztetés */}
      {conflicts.length > 0 && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <h2 className="text-sm font-bold text-red-800">
                {t("appDetailConflictTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-red-600">
                {t("appDetailConflictDesc")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-700">
                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href={`/animals/${app.animal.slug}`} className="shrink-0">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
              <Image src={imgUrl} alt={app.animal.name} fill className="object-cover" sizes="80px" />
            </div>
          </Link>

          <div className="flex flex-1 flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/animals/${app.animal.slug}`}
                  className="text-lg font-bold text-gray-900 hover:text-brand-500"
                >
                  {app.animal.name}
                </Link>
                <p className="text-sm text-gray-400">{app.animal.shelter.name}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                {status.label}
              </span>
            </div>

            {/* Applicant info */}
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 space-y-0.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                  <span className="font-medium">{t("appDetailApplicant")}</span>{" "}
                  <Link href={`/users/${app.userId}`} className="text-brand-600 hover:underline">
                    {app.user.name ?? "–"}
                  </Link>
                </span>
                <RatingBadge targetUserId={app.userId} />
              </p>
              <p><span className="font-medium">{t("appDetailEmail")}</span> {app.user.email}</p>
              {app.user.phone && <p><span className="font-medium">{t("appDetailPhone")}</span> {app.user.phone}</p>}
              {app.homeType && (
                <p>
                  <span className="font-medium">{t("appDetailHomeType")}</span>{" "}
                  {app.homeType === "HOUSE" ? t("appDetailHomeHouse") : app.homeType === "APARTMENT" ? t("appDetailHomeApartment") : t("appDetailHomeOther")}
                  {app.hasGarden ? t("appDetailHomeWithGarden") : ""}
                </p>
              )}
              <p className="flex gap-3">
                {app.hasChildren && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />{t("appDetailHasChildren")}
                  </span>
                )}
                {app.hasPets && (
                  <span className="flex items-center gap-1">
                    <PawPrint className="h-3.5 w-3.5" />{t("appDetailHasPets")}
                  </span>
                )}
              </p>
            </div>

            {app.message && (
              <p className="text-xs text-gray-500 italic">"{app.message}"</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs text-gray-400">
                {t("appDetailSubmittedAt")} {new Date(app.createdAt).toLocaleDateString("hu-HU", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {app.status === "APPROVED" && (
                  <ContractDownloadButton
                    applicationId={app.id}
                    animalName={app.animal.name}
                  />
                )}
                {app.status !== "WITHDRAWN" && (
                  <ApplicationReview applicationId={app.id} currentStatus={app.status} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form responses */}
      {app.responses.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">
            {t("appDetailFilledForm")}
            {app.form && (
              <span className="ml-2 text-sm font-normal text-gray-400">({app.form.title})</span>
            )}
          </h2>

          <div className="space-y-4">
            {app.responses.map((resp) => (
              <div key={resp.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <p className="mb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {resp.field.label}
                  {resp.field.required && (
                    <span className="ml-1 text-red-400">*</span>
                  )}
                </p>

                {resp.fileUrl ? (
                  isImage(resp.fileUrl) ? (
                    <a href={resp.fileUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resp.fileUrl}
                        alt={resp.field.label}
                        className="max-w-sm rounded-xl border border-gray-200 object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={resp.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      {t("appDetailViewFile")}
                    </a>
                  )
                ) : resp.value ? (
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{resp.value}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">{t("appDetailNotFilled")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {app.responses.length === 0 && app.formId && (
        <div className="rounded-2xl border border-dashed border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">{t("appDetailFormNotSubmitted")}</p>
        </div>
      )}

      {app.reviewNotes && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">{t("appDetailAdminNote")}</h2>
          <p className="text-sm text-gray-600">{app.reviewNotes}</p>
        </div>
      )}
    </div>
  );
}
