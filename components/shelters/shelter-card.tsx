import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { MapPin, PawPrint, BadgeCheck, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

interface ShelterCardProps {
  shelter: {
    id: string;
    slug: string;
    name: string;
    city: string;
    address: string;
    logoUrl: string | null;
    isVerified: boolean;
    _count: { animals: number };
  };
}

export async function ShelterCard({ shelter }: ShelterCardProps) {
  const [t, reviews] = await Promise.all([
    getTranslations("shelters"),
    prisma.review.findMany({ where: { shelterId: shelter.id }, select: { rating: true } }),
  ]);
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return (
    <Link href={`/shelters/${shelter.slug}`} className="group flex flex-col">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">

        {/* Gradient top bar */}
        <div className="relative flex h-20 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600">
          <PawPrint className="absolute -left-2 -top-2 h-12 w-12 rotate-[-20deg] text-white/10" />
          <PawPrint className="absolute bottom-0 right-2 h-10 w-10 rotate-[15deg] text-white/10" />
        </div>

        {/* Logo overlapping the gradient */}
        <div className="relative flex justify-center">
          <div className="absolute -top-8 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-white shadow-md">
            {shelter.logoUrl ? (
              <Image
                src={shelter.logoUrl}
                alt={shelter.name}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-50">
                <PawPrint className="h-7 w-7 text-brand-400" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col px-4 pb-4 pt-10">
          <div className="text-center">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-600">
              {shelter.name}
            </h3>

            {shelter.isVerified && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-600">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("verified")}
              </span>
            )}

            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{shelter.city}</span>
            </div>

            {avgRating !== null && (
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-gray-700">{avgRating.toFixed(1)}</span>
                <span className="text-xs text-gray-400">({reviews.length})</span>
              </div>
            )}
          </div>

          {/* Animal count CTA */}
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-2.5">
              <div>
                <span className="text-xl font-black text-brand-600">
                  {shelter._count.animals}
                </span>
                <span className="ml-1.5 text-xs text-brand-500">{t("animalsWaiting")}</span>
              </div>
              <span className="text-xs font-semibold text-brand-600 transition-colors group-hover:text-brand-800">
                {t("view")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
