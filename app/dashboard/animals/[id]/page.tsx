import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalDocuments } from "@/components/dashboard/animal-documents";
import { HealthManager } from "@/components/health/health-manager";
import { BehaviorManager } from "@/components/behavior/behavior-manager";
import { FosterAssign } from "@/components/foster/foster-assign";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const animal = await prisma.animal.findUnique({
    where:  { id: params.id },
    select: { name: true },
  });
  return { title: animal ? `${animal.name} – Iratok` : "Állat" };
}

export default async function AnimalDocumentsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const t = await getTranslations("dashboard");

  const [animal, healthRecords, behaviorLogs] = await Promise.all([
    prisma.animal.findUnique({
      where:   { id: params.id },
      include: {
        shelter:   { select: { id: true, name: true } },
        images:    { where: { isPrimary: true }, take: 1 },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.healthRecord.findMany({
      where:   { animalId: params.id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.behaviorLog.findMany({
      where:   { animalId: params.id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!animal) notFound();

  // Access control: SUPER_ADMIN or shelter admin
  const role = session.user.role ?? "";
  if (role !== "SUPER_ADMIN") {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: animal.shelterId },
    });
    if (!admin) redirect("/dashboard/animals");
  }

  // Active foster carers for placement
  const activeFosters = await prisma.fosterProfile.findMany({
    where:   { shelterId: animal.shelterId, status: "ACTIVE" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const fosterOptions = activeFosters.map(f => ({
    id:    f.id,
    label: f.user.name ?? f.user.email,
  }));

  // Virtual sponsors statistics
  const sponsorAgg = await prisma.sponsorship.aggregate({
    where:  { animalId: animal.id, status: "ACTIVE" },
    _count: { id: true },
    _sum:   { amount: true },
  });
  const sponsorCount   = sponsorAgg._count.id;
  const sponsorRevenue = sponsorAgg._sum.amount ?? 0;

  const imgUrl = animal.images[0]?.url ?? "/placeholder-animal.jpg";

  const docs = animal.documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <Link
        href="/dashboard/animals"
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("animalsDetailBack")}
      </Link>

      {/* Animal header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          <Image src={imgUrl} alt={animal.name} fill className="object-cover" sizes="56px" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
          <p className="text-sm text-gray-500">{animal.shelter.name}</p>
        </div>
      </div>

      {/* Documents section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-gray-800">{t("animalsDetailDocSection")}</h2>
        <p className="mb-5 text-sm text-gray-500">
          {t("animalsDetailDocDesc")}
        </p>
        <AnimalDocuments animalId={animal.id} initialDocs={docs} />
      </div>

      {/* Health records */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <HealthManager
          animalId={animal.id}
          initial={healthRecords.map(r => ({
            ...r,
            date:        r.date.toISOString(),
            nextDueDate: r.nextDueDate?.toISOString() ?? null,
          }))}
        />
      </div>

      {/* Virtual adoption stats */}
      <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50 p-6">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-pink-800">
          {t("animalsDetailVirtualTitle")}
        </h2>
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-xs font-medium text-pink-600">{t("animalsDetailVirtualCount")}</p>
            <p className="mt-1 text-2xl font-bold text-pink-700">{sponsorCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-pink-600">{t("animalsDetailVirtualRevenue")}</p>
            <p className="mt-1 text-2xl font-bold text-pink-700">
              {sponsorRevenue.toLocaleString("hu-HU")}
              <span className="ml-1 text-sm font-medium text-pink-400">HUF</span>
            </p>
          </div>
        </div>
      </div>

      {/* Foster placement */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <FosterAssign
          animalId={animal.id}
          currentFosterId={animal.fosterId}
          fosters={fosterOptions}
        />
      </div>

      {/* Behavior & rehabilitation */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <BehaviorManager
          animalId={animal.id}
          initialFlags={animal.flags}
          initialProgressLevel={animal.progressLevel}
          initialLogs={behaviorLogs.map(r => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
