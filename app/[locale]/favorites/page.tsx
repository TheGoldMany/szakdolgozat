import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalCard } from "@/components/animals/animal-card";
import { getTranslations } from "next-intl/server";
import { AnimalType, AnimalStatus } from "@prisma/client";
import { FavoritesFilter } from "@/components/favorites/favorites-filter";

export const metadata: Metadata = { title: "Kedvenceim" };
export const dynamic = "force-dynamic";

const TYPE_MAP: Record<string, AnimalType> = {
  DOG: "DOG", CAT: "CAT", RABBIT: "RABBIT", BIRD: "BIRD", OTHER: "OTHER",
};
const STATUS_MAP: Record<string, AnimalStatus> = {
  AVAILABLE: "AVAILABLE", PENDING: "PENDING", ADOPTED: "ADOPTED",
};

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string };
}) {
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations("favorites"),
  ]);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/favorites");

  const typeFilter   = searchParams.type   ? TYPE_MAP[searchParams.type]   : undefined;
  const statusFilter = searchParams.status ? STATUS_MAP[searchParams.status] : undefined;

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: session.user.id,
      ...(typeFilter || statusFilter
        ? {
            animal: {
              ...(typeFilter   && { type:   typeFilter   }),
              ...(statusFilter && { status: statusFilter }),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      animal: {
        include: {
          images:  { where: { isPrimary: true }, take: 1 },
          shelter: { select: { id: true, name: true, city: true } },
        },
      },
    },
  });

  const animals = favorites.map((f) => f.animal);

  // Total count before filtering (for the badge)
  const totalCount = await prisma.favorite.count({ where: { userId: session.user.id } });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          {totalCount > 0 && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-500">
              {totalCount}
            </span>
          )}
        </div>

        {totalCount > 0 && <FavoritesFilter />}

        {animals.length === 0 && totalCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-500">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-gray-400">{t("emptyDesc")}</p>
            <Link
              href="/animals"
              className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {t("browseAnimals")}
            </Link>
          </div>
        ) : animals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
            <p className="text-gray-400">{t("noFavoritesForFilter")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {animals.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} isFavorited />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
