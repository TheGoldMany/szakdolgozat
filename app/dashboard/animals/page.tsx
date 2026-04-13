import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatusSelect } from "@/components/dashboard/animal-status-select";
import { AnimalStatus, AnimalType } from "@prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Állatok" };

const TYPE_LABELS: Record<AnimalType, string> = {
  DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb",
};

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

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
    });
    shelterId = admin?.shelterId;
  }

  const statusFilter = searchParams.status as AnimalStatus | undefined;

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

  const statuses = [
    { value: "",             label: "Összes" },
    { value: "AVAILABLE",    label: "Örökbefogadható" },
    { value: "PENDING",      label: "Folyamatban" },
    { value: "ADOPTED",      label: "Örökbefogadott" },
    { value: "FOSTER",       label: "Ideiglenes" },
    { value: "MEDICAL_HOLD", label: "Kezelés alatt" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Állatok</h1>

      {/* Státusz szűrő */}
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
          <span className="text-4xl">🐾</span>
          <p className="mt-3 text-sm text-gray-500">Nincsenek állatok ebben a kategóriában</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Állat</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">Faj</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Menhely</th>
                <th className="px-4 py-3 text-left">Kérelmek</th>
                <th className="px-4 py-3 text-left">Státusz</th>
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
