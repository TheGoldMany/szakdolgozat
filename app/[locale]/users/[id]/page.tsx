import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { MapPin, CalendarDays, PawPrint } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UserReviews } from "@/components/reviews/user-reviews";

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: user?.name ?? "Felhasználó" };
}

export default async function PublicUserProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id:        true,
      name:      true,
      image:     true,
      city:      true,
      country:   true,
      createdAt: true,
      role:      true,
      _count: {
        select: {
          applications:    { where: { status: "APPROVED" } },
          reviewsReceived: true,
        },
      },
    },
  });

  if (!user) notFound();

  const avgReview = user._count.reviewsReceived > 0
    ? await prisma.review.aggregate({
        where:   { targetUserId: params.id },
        _avg:    { rating: true },
      }).then(r => r._avg.rating)
    : null;

  const ROLE_LABEL: Record<string, string> = {
    USER:          "Örökbefogadó",
    SHELTER_ADMIN: "Menhely admin",
    SUPER_ADMIN:   "Adminisztrátor",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 sm:px-6">

        {/* Profil kártya */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Banner */}
          <div className="h-24 bg-gradient-to-r from-brand-400 to-brand-600" />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="relative -mt-12 mb-4 h-20 w-20 overflow-hidden rounded-2xl border-4 border-white shadow-md">
              {user.image ? (
                <Image src={user.image} alt={user.name ?? ""} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-100 text-2xl font-bold text-brand-600">
                  {user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </div>

            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-semibold text-gray-600">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
              {user.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {user.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Tag {new Date(user.createdAt).getFullYear()} óta
              </span>
            </div>

            {/* Statisztikák */}
            <div className="mt-5 grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-200 bg-gray-50">
              <div className="py-3 text-center">
                <p className="text-xl font-bold text-brand-600">{user._count.applications}</p>
                <p className="text-xs text-gray-500">Örökbefogadás</p>
              </div>
              <div className="py-3 text-center">
                <p className="text-xl font-bold text-brand-600">{user._count.reviewsReceived}</p>
                <p className="text-xs text-gray-500">Értékelés</p>
              </div>
              <div className="py-3 text-center">
                <p className="text-xl font-bold text-brand-600">
                  {avgReview ? avgReview.toFixed(1) : "–"}
                </p>
                <p className="text-xs text-gray-500">Átlag</p>
              </div>
            </div>
          </div>
        </div>

        {/* Értékelések */}
        <UserReviews targetUserId={params.id} />
      </div>
    </div>
  );
}
