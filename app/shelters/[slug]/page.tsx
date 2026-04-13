import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { MapPin, Phone, Mail, Globe, PawPrint } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AnimalCard } from "@/components/animals/animal-card";
import { AnimalStatus } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const shelter = await prisma.shelter.findUnique({
    where: { slug: params.slug },
    select: { name: true, city: true },
  });
  if (!shelter) return { title: "Nem található" };
  return { title: `${shelter.name} – ${shelter.city}` };
}

export default async function ShelterDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const shelter = await prisma.shelter.findUnique({
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
      _count: {
        select: {
          animals: { where: { status: AnimalStatus.AVAILABLE } },
        },
      },
    },
  });

  if (!shelter) notFound();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Borítókép / fejléc sáv */}
      <div className="relative h-48 w-full bg-gradient-to-r from-brand-400 to-brand-600 sm:h-64">
        {shelter.coverUrl && (
          <Image
            src={shelter.coverUrl}
            alt={shelter.name}
            fill
            className="object-cover opacity-40"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* Profil sor */}
        <div className="relative -mt-16 mb-6 flex items-end gap-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md sm:h-28 sm:w-28">
            {shelter.logoUrl ? (
              <Image src={shelter.logoUrl} alt={shelter.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-50">
                <PawPrint className="h-10 w-10 text-brand-400" />
              </div>
            )}
          </div>

          <div className="pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white drop-shadow sm:text-2xl">{shelter.name}</h1>
              {shelter.isVerified && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                  ✓ Ellenőrzött
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-white/90 drop-shadow">
              <MapPin className="h-3.5 w-3.5" />
              {shelter.city}
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/shelters" className="hover:text-brand-500">Menhelyek</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">{shelter.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-3">

          {/* Bal: állatok */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Örökbefogadható állatok
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({shelter._count.animals})
                </span>
              </h2>
              {shelter._count.animals > 12 && (
                <Link
                  href={`/animals?shelterId=${shelter.id}`}
                  className="text-sm text-brand-500 hover:underline"
                >
                  Összes →
                </Link>
              )}
            </div>

            {shelter.animals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
                <span className="text-4xl">🐾</span>
                <p className="mt-3 text-sm text-gray-500">Jelenleg nincs örökbefogadható állat</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {shelter.animals.map((animal) => (
                  <AnimalCard key={animal.id} animal={animal} />
                ))}
              </div>
            )}
          </div>

          {/* Jobb: info */}
          <div className="space-y-5">

            {/* Leírás */}
            {shelter.description && (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">Rólunk</h2>
                <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                  {shelter.description}
                </p>
              </div>
            )}

            {/* Elérhetőségek */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Elérhetőségek</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>{shelter.address}, {shelter.city}{shelter.zipCode ? ` ${shelter.zipCode}` : ""}</span>
                </li>
                {shelter.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <a href={`tel:${shelter.phone}`} className="hover:text-brand-500">{shelter.phone}</a>
                  </li>
                )}
                {shelter.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <a href={`mailto:${shelter.email}`} className="hover:text-brand-500 truncate">{shelter.email}</a>
                  </li>
                )}
                {shelter.website && (
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                    <a
                      href={shelter.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-brand-500"
                    >
                      {shelter.website.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                )}
              </ul>
            </div>

          </div>
        </div>

        <div className="pb-10" />
      </div>
    </div>
  );
}
