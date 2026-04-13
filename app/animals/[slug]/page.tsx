import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { MapPin, Phone, Mail, Ruler, Calendar, Weight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AdoptionForm } from "@/components/animals/adoption-form";
import { AnimalStatus, AnimalType } from "@prisma/client";
import { cn } from "@/lib/utils";

// -------------------------------------------------------
// Metadata
// -------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const animal = await prisma.animal.findUnique({
    where: { slug: params.slug },
    select: { name: true, breed: true },
  });
  if (!animal) return { title: "Nem található" };
  return {
    title: `${animal.name}${animal.breed ? ` – ${animal.breed}` : ""}`,
  };
}

// -------------------------------------------------------
// Labels / helpers
// -------------------------------------------------------
const STATUS_LABELS: Record<AnimalStatus, { label: string; color: string }> = {
  AVAILABLE:    { label: "Örökbefogadható", color: "bg-green-100 text-green-700" },
  PENDING:      { label: "Folyamatban",     color: "bg-yellow-100 text-yellow-700" },
  ADOPTED:      { label: "Örökbefogadott",  color: "bg-blue-100 text-blue-700" },
  FOSTER:       { label: "Ideiglenes",      color: "bg-purple-100 text-purple-700" },
  MEDICAL_HOLD: { label: "Kezelés alatt",   color: "bg-red-100 text-red-700" },
};

const TYPE_LABELS: Record<AnimalType, string> = {
  DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb",
};

const SIZE_LABELS: Record<string, string> = {
  SMALL: "Kis", MEDIUM: "Közepes", LARGE: "Nagy", EXTRA_LARGE: "Extra nagy",
};

function formatAge(months: number | null) {
  if (!months) return null;
  if (months < 12) return `${months} hónap`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  return rem > 0 ? `${years} év ${rem} hónap` : `${years} év`;
}

function Trait({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null || ok === undefined) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
      ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
    )}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default async function AnimalDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const [animal, session] = await Promise.all([
    prisma.animal.findUnique({
      where: { slug: params.slug },
      include: {
        images:  { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
        shelter: true,
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!animal) notFound();

  const status = STATUS_LABELS[animal.status];

  // Check if user already applied
  let alreadyApplied = false;
  if (session?.user?.id) {
    const existing = await prisma.adoptionApplication.findUnique({
      where: { userId_animalId: { userId: session.user.id, animalId: animal.id } },
    });
    alreadyApplied = !!existing;
  }

  const primaryImage = animal.images[0];
  const extraImages  = animal.images.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/animals" className="hover:text-brand-500">Állatok</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">{animal.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-5">

          {/* ── Bal oszlop: képek ── */}
          <div className="lg:col-span-3 space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[4/3]">
              {primaryImage ? (
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt ?? animal.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">🐾</div>
              )}
              <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold", status.color)}>
                {status.label}
              </span>
            </div>

            {/* Miniatűrök */}
            {extraImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {extraImages.slice(0, 4).map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                    <Image src={img.url} alt={img.alt ?? ""} fill className="object-cover" sizes="25vw" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Jobb oszlop: adatok + kérelem ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Alap adatok */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
              {animal.breed && (
                <p className="mt-0.5 text-sm text-gray-500">{animal.breed}</p>
              )}

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-24 text-xs font-medium text-gray-400 uppercase tracking-wide">Faj</span>
                  <span>{TYPE_LABELS[animal.type]}</span>
                </div>
                {animal.gender && (
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-xs font-medium text-gray-400 uppercase tracking-wide">Nem</span>
                    <span>{animal.gender === "MALE" ? "♂ Hím" : animal.gender === "FEMALE" ? "♀ Nőstény" : "Ismeretlen"}</span>
                  </div>
                )}
                {animal.age && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">Kor</span>
                    <span>{formatAge(animal.age)}</span>
                  </div>
                )}
                {animal.size && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-gray-400" />
                    <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">Méret</span>
                    <span>{SIZE_LABELS[animal.size] ?? animal.size}</span>
                  </div>
                )}
                {animal.weight && (
                  <div className="flex items-center gap-2">
                    <Weight className="h-3.5 w-3.5 text-gray-400" />
                    <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">Súly</span>
                    <span>{animal.weight} kg</span>
                  </div>
                )}
                {animal.color && (
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-xs font-medium text-gray-400 uppercase tracking-wide">Szín</span>
                    <span>{animal.color}</span>
                  </div>
                )}
              </div>

              {/* Egészségügyi státusz */}
              <div className="mt-4 flex flex-wrap gap-2">
                {animal.isVaccinated   && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">💉 Oltott</span>}
                {animal.isNeutered     && <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">✂️ Ivartalanított</span>}
                {animal.isMicrochipped && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">📡 Chippelt</span>}
              </div>

              {/* Jellemzők */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Trait ok={animal.isGoodWithKids} label="Gyerekbarát" />
                <Trait ok={animal.isGoodWithDogs} label="Kutyabarát" />
                <Trait ok={animal.isGoodWithCats} label="Macskajáró" />
              </div>
            </div>

            {/* Menhely */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Menhely</h2>
              <Link href={`/shelters/${animal.shelter.slug}`} className="font-medium text-brand-500 hover:underline">
                {animal.shelter.name}
              </Link>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {animal.shelter.city}{animal.shelter.address ? `, ${animal.shelter.address}` : ""}
                </div>
                {animal.shelter.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {animal.shelter.phone}
                  </div>
                )}
                {animal.shelter.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {animal.shelter.email}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Leírás */}
        {animal.description && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-800">Leírás</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{animal.description}</p>
          </div>
        )}

        {/* Örökbefogadási kérelem */}
        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-800">Örökbefogadási kérelem</h2>

          {animal.status !== AnimalStatus.AVAILABLE ? (
            <p className="text-sm text-gray-500">
              Ez az állat jelenleg nem fogadható örökbe (<span className="font-medium">{status.label}</span>).
            </p>
          ) : !session ? (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 text-center">
              <p className="text-sm text-gray-600">A kérelem beküldéséhez be kell jelentkezned.</p>
              <Link
                href={`/auth/login?callbackUrl=/animals/${animal.slug}`}
                className="mt-3 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Bejelentkezés
              </Link>
            </div>
          ) : alreadyApplied ? (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 text-center">
              <p className="font-medium text-blue-800">Már nyújtottál be kérelmet ehhez az állathoz.</p>
              <p className="mt-1 text-sm text-blue-600">Kövesd nyomon a kérelmeid állapotát a profilodon.</p>
              <Link href="/applications" className="mt-3 inline-block text-sm font-medium text-blue-700 underline">
                Kérelmeim →
              </Link>
            </div>
          ) : (
            <AdoptionForm animalId={animal.id} animalName={animal.name} />
          )}
        </div>

      </div>
    </div>
  );
}
