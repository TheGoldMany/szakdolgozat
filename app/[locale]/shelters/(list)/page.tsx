import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ShelterCard } from "@/components/shelters/shelter-card";
import { AnimalStatus } from "@prisma/client";
import { Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

/**
 * A listaoldal a kulcsszavas belépési pont: a cím eddig csak a menüpont
 * szövege volt (pl. „Állatok"), leírás nélkül. A keresőtalálatban a leírás
 * adja a kattintás okát, és kanonikus cím + hreflang nélkül a négy nyelvi
 * változat duplikátumnak látszott.
 */
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("seo");
  return pageMetadata({
    locale:      params.locale,
    path:        "/shelters",
    title:       t("sheltersTitle"),
    description: t("sheltersDescription"),
  });
}

// ISR: a menhelylista ritkán változik, 2 percenként frissül (gyors betöltés cache-ből)
export const revalidate = 120;

export default async function SheltersPage() {
  const t = await getTranslations("shelters");

  const [rawShelters, ratings] = await Promise.all([
    prisma.shelter.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true, slug: true, name: true, city: true, logoUrl: true, isVerified: true,
        _count: { select: { animals: { where: { status: AnimalStatus.AVAILABLE } } } },
        // A kártya kis fotói: az első néhány örökbefogadható állat főképe.
        animals: {
          where:   { status: AnimalStatus.AVAILABLE, images: { some: { isPrimary: true } } },
          orderBy: { createdAt: "desc" },
          take:    4,
          select:  { images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
        },
      },
    }),
    // Egyetlen összesítő lekérdezés: korábban minden kártya külön kérte le
    // a saját értékeléseit (menhelyenként egy lekérdezés).
    prisma.review.groupBy({ by: ["shelterId"], _avg: { rating: true }, _count: { _all: true } }),
  ]);
  const ratingBy = new Map(ratings.map((r) => [r.shelterId, { avg: r._avg.rating ?? 0, count: r._count._all }]));
  // Akinél van örökbefogadható állat, előre kerül: a látogató azt keresi.
  const shelters = [...rawShelters].sort((a, b) => b._count.animals - a._count.animals);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">{t("count", { count: shelters.length })}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {shelters.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
            <Building2 className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-700">{t("noShelters")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {shelters.map((shelter) => (
              <ShelterCard
                key={shelter.id}
                shelter={shelter}
                thumbs={shelter.animals.map((a) => a.images[0]?.url).filter((u): u is string => Boolean(u))}
                rating={ratingBy.get(shelter.id) ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
