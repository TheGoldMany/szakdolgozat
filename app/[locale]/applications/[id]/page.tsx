import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { ArrowLeft, FileText } from "lucide-react";
import { ContractDownloadButton } from "@/components/applications/contract-download-button";
import { ApplicationTimeline } from "@/components/applications/application-timeline";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("applications");
  return { title: t("detailTitle") };
}

function isImage(url: string) {
  return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

export default async function UserApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const t = await getTranslations("applications");

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    INVITED:   { label: t("statusInvited"),   color: "bg-purple-100 text-purple-700" },
    PENDING:   { label: t("statusPending"),   color: "bg-yellow-100 text-yellow-700" },
    REVIEWING: { label: t("statusReviewing"), color: "bg-blue-100 text-blue-700" },
    APPROVED:  { label: t("statusApproved"),  color: "bg-green-100 text-green-700" },
    REJECTED:  { label: t("statusRejected"),  color: "bg-red-100 text-red-700" },
    WITHDRAWN: { label: t("statusWithdrawn"), color: "bg-gray-100 text-gray-500" },
  };

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/applications");

  const app = await prisma.adoptionApplication.findUnique({
    where: { id: params.id },
    include: {
      animal: {
        include: {
          images:  { where: { isPrimary: true }, take: 1 },
          shelter: { select: { name: true, city: true } },
        },
      },
      form: { select: { title: true } },
      responses: {
        include: { field: true },
        orderBy: { field: { order: "asc" } },
      },
    },
  });

  // Only the owner can view their application
  if (!app || app.userId !== session.user.id) notFound();

  const status = STATUS_LABELS[app.status] ?? { label: app.status, color: "bg-gray-100 text-gray-500" };
  const imgUrl = app.animal.images[0]?.url ?? "/placeholder-animal.jpg";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        <Link
          href="/applications"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToApplications")}
        </Link>

        {/* Animal + status */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex gap-4 p-5">
            <Link href={`/animals/${app.animal.slug}`} className="shrink-0">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-100">
                <Image src={imgUrl} alt={app.animal.name} fill className="object-cover" sizes="80px" />
              </div>
            </Link>
            <div className="flex flex-1 flex-col justify-center min-w-0 gap-1">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/animals/${app.animal.slug}`}
                  className="text-lg font-bold text-gray-900 hover:text-brand-500 transition-colors"
                >
                  {app.animal.name}
                </Link>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {app.animal.shelter.city} · {app.animal.shelter.name}
              </p>
              <p className="text-xs text-gray-400">
                {t("submittedAt")} {new Date(app.createdAt).toLocaleDateString("hu-HU", {
                  year: "numeric", month: "long", day: "numeric",
                })}
              </p>
            </div>
          </div>

          {app.status === "APPROVED" && (
            <div className="border-t border-green-50 bg-green-50 px-5 py-3">
              <p className="mb-2.5 text-xs font-medium text-green-700">
                {t("approvedBannerText")}
              </p>
              <ContractDownloadButton applicationId={app.id} animalName={app.animal.name} />
            </div>
          )}
          {app.reviewNotes && (
            <div className="border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{t("shelterNote")} </span>
                {app.reviewNotes}
              </p>
            </div>
          )}
        </div>

        {/* Állapot idővonal */}
        <ApplicationTimeline
          status={app.status}
          createdAt={app.createdAt.toISOString()}
          reviewedAt={app.reviewedAt ? app.reviewedAt.toISOString() : null}
        />

        {/* Submitted form responses */}
        {app.responses.length > 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-5">
            <h2 className="font-semibold text-gray-900">
              {t("filledForm")}
              {app.form && (
                <span className="ml-2 text-sm font-normal text-gray-400">({app.form.title})</span>
              )}
            </h2>

            <div className="space-y-5">
              {app.responses.map((resp) => (
                <div key={resp.id} className="border-b border-gray-50 pb-5 last:border-0 last:pb-0">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {resp.field.label}
                  </p>

                  {resp.fileUrl ? (
                    isImage(resp.fileUrl) ? (
                      <a href={resp.fileUrl} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resp.fileUrl}
                          alt={resp.field.label}
                          className="max-w-sm rounded-xl border border-gray-100 object-cover"
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
                        {t("viewFile")}
                      </a>
                    )
                  ) : resp.value ? (
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{resp.value}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">{t("notFilled")}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : app.formId ? (
          <div className="rounded-2xl border border-dashed border-yellow-200 bg-yellow-50 p-6 text-center">
            <p className="text-sm text-yellow-700">{t("formNotSubmitted")}</p>
            {app.inviteToken && (
              <Link
                href={`/apply/${app.inviteToken}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-600 transition-colors"
              >
                {t("fillForm")}
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
