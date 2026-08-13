import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { AnimalStatusSelect } from "@/components/dashboard/animal-status-select";
import { AddAnimalPanel } from "@/components/dashboard/add-animal-panel";
import { AnimalStatus, AnimalType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { PawPrint, FileText } from "lucide-react";
import { ExportButton } from "@/components/dashboard/export-button";
import { TransferRequestButton } from "@/components/transfers/transfer-request-button";
import { resolveActingShelter } from "@/lib/acting-shelter";

export const metadata: Metadata = { title: "Állatok" };

const STATUS_COLOR: Record<AnimalStatus, string> = {
  AVAILABLE:    "bg-green-100 text-green-700",
  PENDING:      "bg-yellow-100 text-yellow-700",
  ADOPTED:      "bg-blue-100 text-blue-700",
  FOSTER:       "bg-purple-100 text-purple-700",
  MEDICAL_HOLD: "bg-red-100 text-red-700",
};

export default async function DashboardAnimalsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard");

  const acting = await resolveActingShelter(session.user.id, session.user.role);
  const shelterId = acting.shelterId;

  const statusFilter = searchParams.status as AnimalStatus | undefined;

  const otherShelters = await prisma.shelter.findMany({
    where:  { isActive: true, ...(shelterId && { NOT: { id: shelterId } }) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const animals = await prisma.animal.findMany({
    where: {
      ...(shelterId && { shelterId }),
      ...(statusFilter && { status: statusFilter }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      images:  { where: { isPrimary: true }, take: 1 },
      shelter: { select: { name: true } },
      _count:  { select: { applications: true } },
    },
  });

  const TYPE_LABELS: Record<AnimalType, string> = {
    DOG:    t("animalsTypeDog"),
    CAT:    t("animalsTypeCat"),
    RABBIT: t("animalsTypeRabbit"),
    BIRD:   t("animalsTypeBird"),
    OTHER:  t("animalsTypeOther"),
  };

  const statuses = [
    { value: "",             label: t("animalsFilterAll") },
    { value: "AVAILABLE",    label: t("animalsStatusAvailable") },
    { value: "PENDING",      label: t("animalsStatusPending") },
    { value: "ADOPTED",      label: t("animalsStatusAdopted") },
    { value: "FOSTER",       label: t("animalsStatusFoster") },
    { value: "MEDICAL_HOLD", label: t("animalsStatusMedicalHold") },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{t("animalsTitle")}</h1>
          <PageInfo page="animals" />
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="animals" />
          <AddAnimalPanel />
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={s.value ? `/dashboard/animals?status=${s.value}` : "/dashboard/animals"}
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

      {animals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <PawPrint className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t("animalsEmpty")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">{t("animalsTableAnimal")}</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">{t("animalsTableSpecies")}</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">{t("animalsTableShelter")}</th>
                <th className="px-4 py-3 text-left">{t("animalsTableApplications")}</th>
                <th className="px-4 py-3 text-left">{t("animalsTableStatus")}</th>
                <th className="hidden px-4 py-3 text-left lg:table-cell">{t("animalsTableTransfer")}</th>
                <th className="px-4 py-3 text-left">{t("animalsTableDocs")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {animals.map((animal) => {
                const imgUrl = animal.images[0]?.url ?? "/placeholder-animal.jpg";
                return (
                  <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          <Image src={imgUrl} alt={animal.name} fill className="object-cover" sizes="36px" />
                        </div>
                        <Link href={`/animals/${animal.slug}`}
                          className="font-medium text-gray-800 hover:text-brand-500">
                          {animal.name}
                        </Link>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">
                      {TYPE_LABELS[animal.type]}
                    </td>
                    <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                      {animal.shelter.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {animal._count.applications > 0 ? (
                        <Link href={`/dashboard/applications`}
                          className="font-medium text-brand-500 hover:underline">
                          {animal._count.applications}
                        </Link>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AnimalStatusSelect
                        animalId={animal.id}
                        currentStatus={animal.status}
                      />
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {otherShelters.length > 0 && (
                        <TransferRequestButton
                          animalId={animal.id}
                          animalName={animal.name}
                          shelters={otherShelters}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/animals/${animal.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600"
                        title={t("animalsTableDocsTitle")}
                      >
                        <FileText className="h-4 w-4" />
                        {t("animalsTableDocs")}
                      </Link>
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
