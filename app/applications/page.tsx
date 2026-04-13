import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WithdrawButton } from "@/components/applications/withdraw-button";
import { ApplicationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kérelmeim" };

const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
  PENDING:   { label: "Várakozó",       color: "bg-yellow-100 text-yellow-700" },
  REVIEWING: { label: "Elbírálás alatt", color: "bg-blue-100 text-blue-700" },
  APPROVED:  { label: "Elfogadva",       color: "bg-green-100 text-green-700" },
  REJECTED:  { label: "Elutasítva",      color: "bg-red-100 text-red-700" },
  WITHDRAWN: { label: "Visszavont",      color: "bg-gray-100 text-gray-500" },
};

export default async function ApplicationsPage() {
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
          shelter: { select: { name: true, city: true } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kérelmeim</h1>
          <p className="mt-2 text-gray-500">
            {applications.length === 0
              ? "Még nem adtál be örökbefogadási kérelmet."
              : `${applications.length} kérelem összesen`}
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <span className="text-5xl">📋</span>
            <p className="mt-4 text-lg font-medium text-gray-700">Nincsenek kérelmeid</p>
            <p className="mt-1 text-sm text-gray-400">Böngéssz az állatok között és adj be kérelmet!</p>
            <Link
              href="/animals"
              className="mt-5 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Állatok böngészése
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const status = STATUS_LABELS[app.status];
              const imgUrl = app.animal.images[0]?.url ?? "/placeholder-animal.jpg";

              return (
                <div
                  key={app.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="flex gap-4 p-4">
                    {/* Kép */}
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

                    {/* Adatok */}
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
                        {app.status === ApplicationStatus.PENDING && (
                          <WithdrawButton applicationId={app.id} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Üzenet / megjegyzés */}
                  {(app.message || app.reviewNotes) && (
                    <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500 space-y-1">
                      {app.message && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-600">Motiváció: </span>
                          {app.message}
                        </p>
                      )}
                      {app.reviewNotes && (
                        <p className="line-clamp-2">
                          <span className="font-medium text-gray-600">Menhely megjegyzése: </span>
                          {app.reviewNotes}
                        </p>
                      )}
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
