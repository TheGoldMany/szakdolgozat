import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalDocuments } from "@/components/dashboard/animal-documents";
import { HealthManager } from "@/components/health/health-manager";
import { BehaviorManager } from "@/components/behavior/behavior-manager";

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
        Vissza az állatokhoz
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
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-gray-800">Iratok és dokumentumok</h2>
        <p className="mb-5 text-sm text-gray-500">
          Oltási könyv, egészségügyi igazolás, mikrochip dokumentum stb.
        </p>
        <AnimalDocuments animalId={animal.id} initialDocs={docs} />
      </div>

      {/* Health records */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <HealthManager
          animalId={animal.id}
          initial={healthRecords.map(r => ({
            ...r,
            date:        r.date.toISOString(),
            nextDueDate: r.nextDueDate?.toISOString() ?? null,
          }))}
        />
      </div>

      {/* Behavior & rehabilitation */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
