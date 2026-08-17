import { Suspense } from "react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalCard } from "@/components/animals/animal-card";
import { AnimalsFilters } from "@/components/animals/animals-filters";
import { AnimalStatus, AnimalType, AnimalSize } from "@prisma/client";
import { PawPrint } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("animals");
  return { title: t("title") };
}

interface PageProps {
  searchParams: {
    q?: string;
    type?: string;
    size?: string;
    gender?: string;
    city?: string;
    vaccinated?: string;
    neutered?: string;
    goodWithKids?: string;
    goodWithDogs?: string;
    goodWithCats?: string;
    page?: string;
  };
}

const PAGE_SIZE = 12;

export default async function AnimalsPage({ searchParams }: PageProps) {
  const t      = await getTranslations("animals");
  const locale = await getLocale();
  const basePath = locale === routing.defaultLocale ? "/animals" : `/${locale}/animals`;

  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const search = searchParams.q?.trim();
  const type   = searchParams.type as AnimalType | undefined;
  const size   = searchParams.size as AnimalSize | undefined;
  const gender = searchParams.gender;
  const city   = searchParams.city?.trim();

  const where = {
    status: AnimalStatus.AVAILABLE,
    ...(type   && { type }),
    ...(size   && { size }),
    ...(gender && { gender }),
    // Csak aktív (nem felfüggesztett) menhelyek állatai jelenjenek meg
    shelter: { is: { isActive: true, ...(city ? { city } : {}) } },
    ...(searchParams.vaccinated   === "1" && { isVaccinated:   true }),
    ...(searchParams.neutered     === "1" && { isNeutered:     true }),
    ...(searchParams.goodWithKids === "1" && { isGoodWithKids: true }),
    ...(searchParams.goodWithDogs === "1" && { isGoodWithDogs: true }),
    ...(searchParams.goodWithCats === "1" && { isGoodWithCats: true }),
    ...(search && {
      OR: [
        { name:  { contains: search, mode: "insensitive" as const } },
        { breed: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [animals, total, cityRows] = await Promise.all([
    prisma.animal.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        images:  { where: { isPrimary: true }, take: 1 },
        shelter: { select: { id: true, name: true, city: true } },
      },
    }),
    prisma.animal.count({ where }),
    // Csak azok a városok, ahol van örökbefogadható állat
    prisma.shelter.findMany({
      where:    { isActive: true, animals: { some: { status: AnimalStatus.AVAILABLE } } },
      select:   { city: true },
      distinct: ["city"],
      orderBy:  { city: "asc" },
    }),
  ]);

  const cities = cityRows.map((r) => r.city).filter(Boolean);

  // A bejelentkezett felhasználó kedvencei (a szív ikon kezdőállapotához)
  const session = await getServerSession(authOptions);
  let favoriteIds = new Set<string>();
  if (session?.user?.id && animals.length > 0) {
    const favs = await prisma.favorite.findMany({
      where:  { userId: session.user.id, animalId: { in: animals.map((a) => a.id) } },
      select: { animalId: true },
    });
    favoriteIds = new Set(favs.map((f) => f.animalId));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">{t("showing", { count: total })}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <Suspense>
              <AnimalsFilters cities={cities} />
            </Suspense>
          </aside>

          <main className="flex-1">
            {animals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center">
                <PawPrint className="h-12 w-12 text-gray-300" />
                <p className="mt-4 text-lg font-medium text-gray-700">{t("noResults")}</p>
                <p className="mt-1 text-sm text-gray-400">{t("noResultsDesc")}</p>
              </div>
            ) : (
              <>
                <div className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {animals.map((animal) => (
                    <AnimalCard key={animal.id} animal={animal} isFavorited={favoriteIds.has(animal.id)} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination page={page} totalPages={totalPages} searchParams={searchParams} basePath={basePath} t={t} />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  searchParams,
  basePath,
  t,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  basePath: string;
  t: Awaited<ReturnType<typeof getTranslations<"animals">>>;
}) {
  function buildUrl(p: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <a
        href={page > 1 ? buildUrl(page - 1) : "#"}
        aria-disabled={page <= 1}
        className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
          page <= 1
            ? "pointer-events-none border-gray-100 bg-gray-50 text-gray-300"
            : "border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
        }`}
      >
        ← {t("prevPage")}
      </a>

      <span className="rounded-xl border border-gray-100 bg-white px-4 py-2.5 text-sm font-medium text-gray-500 shadow-sm">
        {t("page", { current: page, total: totalPages })}
      </span>

      <a
        href={page < totalPages ? buildUrl(page + 1) : "#"}
        aria-disabled={page >= totalPages}
        className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
          page >= totalPages
            ? "pointer-events-none border-gray-100 bg-gray-50 text-gray-300"
            : "border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50"
        }`}
      >
        {t("nextPage")} →
      </a>
    </div>
  );
}
