import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { MapPin, Phone, Mail, Globe, PawPrint, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AnimalCard } from "@/components/animals/animal-card";
import { TierCard } from "@/components/donate/tier-card";
import { AnimalStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const [shelter, t] = await Promise.all([
    prisma.shelter.findUnique({ where: { slug: params.slug }, select: { name: true, city: true } }),
    getTranslations("shelters"),
  ]);
  if (!shelter) return { title: t("notFound") };
  return { title: `${shelter.name} – ${shelter.city}` };
}

export default async function ShelterDetailPage({ params }: { params: { slug: string } }) {
  const [shelter, t] = await Promise.all([
    prisma.shelter.findUnique({
      where: { slug: params.slug },
      include: {
        animals: {
          where: { status: AnimalStatus.AVAILABLE },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            images:  { where: { isPrimary: true }, take: 1 },
            shelter: { select: { id: true, name: true, city: true } },
          },
        },
        tiers: {
          where: { isActive: true },
          include: { _count: { select: { subscriptions: true } } },
        },
        _count: { select: { animals: { where: { status: AnimalStatus.AVAILABLE } } } },
      },
    }),
    getTranslations("shelters"),
  ]);

  if (!shelter) notFound();

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-r from-brand-400 to-brand-600 sm:h-52">
        {shelter.coverUrl && (
          <Image src={shelter.coverUrl} alt="" fill className="object-cover opacity-50" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      <div className="border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-end sm:gap-5">

            <div className="relative -mt-12 h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:-mt-14 sm:h-28 sm:w-28">
              {shelter.logoUrl ? (
                <Image src={shelter.logoUrl} alt={shelter.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-brand-50">
                  <PawPrint className="h-10 w-10 text-brand-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 pb-1 pt-2 sm:pt-0">
              <nav className="mb-1.5 flex items-center gap-1 text-xs text-gray-400">
                <Link href="/shelters" className="hover:text-brand-500 transition-colors">{t("breadcrumb")}</Link>
                <span>›</span>
                <span className="text-gray-600">{shelter.name}</span>
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{shelter.name}</h1>
                {shelter.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                    <CheckCircle2 className="h-3 w-3" />{t("verified")}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>{shelter.city}</span>
                {shelter.address && <><span className="text-gray-300">·</span><span className="truncate">{shelter.address}</span></>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Animals column */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {t("adoptableAnimals")}
                <span className="ml-2 text-sm font-normal text-gray-400">({shelter._count.animals})</span>
              </h2>
              {shelter._count.animals > 12 && (
                <Link href={`/animals?shelterId=${shelter.id}`} className="text-sm text-brand-500 hover:underline">
                  {t("allAnimals")}
                </Link>
              )}
            </div>

            {shelter.animals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <PawPrint className="h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">{t("noAnimals")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {shelter.animals.map((animal) => <AnimalCard key={animal.id} animal={animal} />)}
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="space-y-5">
            {shelter.description && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">{t("about")}</h2>
                <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{shelter.description}</p>
              </div>
            )}

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">{t("contact")}</h2>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>{shelter.address}, {shelter.city}{shelter.zipCode ? ` ${shelter.zipCode}` : ""}</span>
                </li>
                {shelter.phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <a href={`tel:${shelter.phone}`} className="hover:text-brand-500 transition-colors">{shelter.phone}</a>
                  </li>
                )}
                {shelter.email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <a href={`mailto:${shelter.email}`} className="min-w-0 truncate hover:text-brand-500 transition-colors">{shelter.email}</a>
                  </li>
                )}
                {shelter.website && (
                  <li className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                    <a href={shelter.website} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:text-brand-500 transition-colors">
                      {shelter.website.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {shelter.tiers.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-gray-700">{t("monthlySubscriptions")}</h2>
                <div className="flex flex-col gap-3">
                  {shelter.tiers.map((tier) => <TierCard key={tier.id} tier={tier} />)}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
              <p className="text-center text-3xl font-bold text-brand-600">{shelter._count.animals}</p>
              <p className="mt-1 text-center text-sm text-brand-500">{t("animalsWaitingCount", { count: shelter._count.animals })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
