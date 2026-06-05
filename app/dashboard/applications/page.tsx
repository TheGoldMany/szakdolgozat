import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationReview } from "@/components/dashboard/application-review";
import { ApplicationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Users, PawPrint, FileText, Clock, ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Kérelmek" };

const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
  INVITED:   { label: "Meghívva",        color: "bg-purple-100 text-purple-700" },
  PENDING:   { label: "Várakozó",        color: "bg-yellow-100 text-yellow-700" },
  REVIEWING: { label: "Elbírálás alatt", color: "bg-blue-100 text-blue-700" },
  APPROVED:  { label: "Elfogadva",       color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "Elutasítva",      color: "bg-red-100 text-red-700" },
  WITHDRAWN: { label: "Visszavont",      color: "bg-gray-100 text-gray-500" },
};

export default async function DashboardApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
    });
    shelterId = admin?.shelterId;
  }

  const statusFilter = searchParams.status as ApplicationStatus | undefined;

  const applications = await prisma.adoptionApplication.findMany({
    where: {
      ...(statusFilter && { status: statusFilter }),
      ...(shelterId && { animal: { shelterId } }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user:   { select: { name: true, email: true, phone: true } },
      animal: {
        include: {
          images:  { where: { isPrimary: true }, take: 1 },
          shelter: { select: { name: true } },
        },
      },
      _count: { select: { responses: true } },
    },
  });

  const statuses: Array<{ value: string; label: string }> = [
    { value: "",          label: "Összes" },
    { value: "INVITED",   label: "Meghívva" },
    { value: "PENDING",   label: "Várakozó" },
    { value: "REVIEWING", label: "Elbírálás alatt" },
    { value: "APPROVED",  label: "Elfogadott" },
    { value: "REJECTED",  label: "Elutasított" },
    { value: "WITHDRAWN", label: "Visszavont" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Kérelmek</h1>

      {/* Státusz szűrő */}
      <div className="mb-5 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={s.value ? `/dashboard/applications?status=${s.value}` : "/dashboard/applications"}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              (searchParams.status ?? "") === s.value
                ? "bg-brand-500 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <ClipboardList className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">Nincs kérelem ebben a kategóriában</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const status       = STATUS_LABELS[app.status];
            const imgUrl       = app.animal.images[0]?.url ?? "/placeholder-animal.jpg";
            const hasForm      = !!app.formId;
            const formFilled   = app._count.responses > 0;

            return (
              <div key={app.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row">

                  {/* Állat kép */}
                  <Link href={`/animals/${app.animal.slug}`} className="shrink-0">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                      <Image src={imgUrl} alt={app.animal.name} fill className="object-cover" sizes="64px" />
                    </div>
                  </Link>

                  {/* Adatok */}
                  <div className="flex flex-1 flex-col gap-3 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/animals/${app.animal.slug}`}
                          className="font-semibold text-gray-900 hover:text-brand-500">
                          {app.animal.name}
                        </Link>
                        <p className="text-xs text-gray-400">{app.animal.shelter.name}</p>
                      </div>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                        {status.label}
                      </span>
                    </div>

                    {/* Kérelmező */}
                    <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 space-y-0.5">
                      <p><span className="font-medium">Kérelmező:</span> {app.user.name ?? "–"}</p>
                      <p><span className="font-medium">Email:</span> {app.user.email}</p>
                      {app.user.phone && <p><span className="font-medium">Telefon:</span> {app.user.phone}</p>}
                      {app.homeType && (
                        <p><span className="font-medium">Lakástípus:</span>{" "}
                          {app.homeType === "HOUSE" ? "Ház" : app.homeType === "APARTMENT" ? "Lakás" : "Egyéb"}
                          {app.hasGarden ? " (kerttel)" : ""}
                        </p>
                      )}
                      <p className="flex gap-3">
                        {app.hasChildren && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Gyerek a háztartásban</span>}
                        {app.hasPets    && <span className="flex items-center gap-1"><PawPrint className="h-3.5 w-3.5" />Van más állat</span>}
                      </p>
                    </div>

                    {app.message && (
                      <p className="text-xs text-gray-500 italic line-clamp-3">"{app.message}"</p>
                    )}

                    {app.reviewNotes && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Megjegyzés:</span> {app.reviewNotes}
                      </p>
                    )}

                    {/* Kérvény állapot (form-alapú kérelemnél) */}
                    {hasForm && (
                      <div className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
                        formFilled
                          ? "bg-brand-50 border border-brand-100"
                          : "bg-yellow-50 border border-yellow-100"
                      )}>
                        {formFilled ? (
                          <>
                            <FileText className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                            <span className="flex-1 font-medium text-brand-700">A kérvény be lett küldve</span>
                            <Link
                              href={`/dashboard/applications/${app.id}`}
                              className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
                            >
                              Megtekintés
                            </Link>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 shrink-0 text-yellow-600" />
                            <span className="text-yellow-700">Még nem küldte be a kérvényt</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(app.createdAt).toLocaleDateString("hu-HU", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                      {app.status !== "WITHDRAWN" && (
                        <ApplicationReview
                          applicationId={app.id}
                          currentStatus={app.status}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
