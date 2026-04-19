import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AnimalCard } from "@/components/animals/animal-card";
import { AnimalsFilters } from "@/components/animals/animals-filters";
import { AnimalStatus, AnimalType, AnimalSize } from "@prisma/client";
import { PawPrint } from "lucide-react";
import { getTranslations } from "next-intl/server";

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
    page?: string;
  };
}

const PAGE_SIZE = 12;

export default async function AnimalsPage({ searchParams }: PageProps) {
  const t = await getTranslations("animals");

  const page   = Math.max(1, Number(searchParams.page ?? 1));
  const search = searchParams.q?.trim();
  const type   = searchParams.type as AnimalType | undefined;
  const size   = searchParams.size as AnimalSize | undefined;
  const gender = searchParams.gender;

  const where = {
    status: AnimalStatus.AVAILABLE,
    ...(type   && { type }),
    ...(size   && { size }),
    ...(gender && { gender }),
    ...(search && {
      OR: [
        { name:  { contains: search, mode: "insensitive" as const } },
        { breed: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [animals, total] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-2 text-gray-500">{t("showing", { count: total })}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <Suspense>
              <AnimalsFilters />
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
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {animals.map((animal) => (
                    <AnimalCard key={animal.id} animal={animal} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination page={page} totalPages={totalPages} searchParams={searchParams} t={t} />
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
  t,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
  t: Awaited<ReturnType<typeof getTranslations<"animals">>>;
}) {
  function buildUrl(p: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    params.set("page", String(p));
    return `/animals?${params.toString()}`;
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {page > 1 && (
        <a href={buildUrl(page - 1)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          ← {t("prevPage")}
        </a>
      )}
      <span className="text-sm text-gray-500">{t("page", { current: page, total: totalPages })}</span>
      {page < totalPages && (
        <a href={buildUrl(page + 1)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t("nextPage")} →
        </a>
      )}
    </div>
  );
}
