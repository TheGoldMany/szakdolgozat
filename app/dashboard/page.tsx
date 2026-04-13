import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ApplicationStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Áttekintés" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  // Shelter admin esetén megkeressük a saját menhelyét
  let shelterId: string | undefined;
  if (!isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
    });
    shelterId = admin?.shelterId;
  }

  const shelterFilter = shelterId ? { shelterId } : {};

  const [totalAnimals, availableAnimals, adoptedAnimals, pendingApps, totalApps] =
    await Promise.all([
      prisma.animal.count({ where: shelterFilter }),
      prisma.animal.count({ where: { ...shelterFilter, status: AnimalStatus.AVAILABLE } }),
      prisma.animal.count({ where: { ...shelterFilter, status: AnimalStatus.ADOPTED } }),
      prisma.adoptionApplication.count({
        where: {
          status: ApplicationStatus.PENDING,
          ...(shelterId && { animal: { shelterId } }),
        },
      }),
      prisma.adoptionApplication.count({
        where: shelterId ? { animal: { shelterId } } : {},
      }),
    ]);

  const stats = [
    { label: "Összes állat",        value: totalAnimals,    color: "bg-gray-50  text-gray-700" },
    { label: "Örökbefogadható",     value: availableAnimals, color: "bg-green-50 text-green-700" },
    { label: "Örökbefogadott",      value: adoptedAnimals,  color: "bg-blue-50  text-blue-700" },
    { label: "Várakozó kérelem",    value: pendingApps,     color: "bg-yellow-50 text-yellow-700" },
    { label: "Összes kérelem",      value: totalApps,       color: "bg-brand-50 text-brand-700" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Áttekintés</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm`}>
            <p className="text-xs font-medium text-gray-500">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
