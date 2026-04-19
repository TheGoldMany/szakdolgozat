import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ShelterCard } from "@/components/shelters/shelter-card";
import { AnimalStatus } from "@prisma/client";
import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shelters");
  return { title: t("title") };
}

export default async function SheltersPage() {
  const t = await getTranslations("shelters");

  const shelters = await prisma.shelter.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          animals: { where: { status: AnimalStatus.AVAILABLE } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-2 text-gray-500">{t("count", { count: shelters.length })}</p>
        </div>

        {shelters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <Building2 className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-700">{t("noShelters")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shelters.map((shelter) => (
              <ShelterCard key={shelter.id} shelter={shelter} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
