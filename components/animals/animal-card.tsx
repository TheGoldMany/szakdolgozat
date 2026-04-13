import Link from "next/link";
import Image from "next/image";
import { MapPin, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimalType, AnimalStatus } from "@prisma/client";

const STATUS_LABELS: Record<AnimalStatus, { label: string; color: string }> = {
  AVAILABLE:    { label: "Örökbefogadható", color: "bg-green-100 text-green-700" },
  PENDING:      { label: "Folyamatban",     color: "bg-yellow-100 text-yellow-700" },
  ADOPTED:      { label: "Örökbefogadott",  color: "bg-blue-100 text-blue-700" },
  FOSTER:       { label: "Ideiglenes",      color: "bg-purple-100 text-purple-700" },
  MEDICAL_HOLD: { label: "Kezelés alatt",   color: "bg-red-100 text-red-700" },
};

const TYPE_EMOJI: Record<AnimalType, string> = {
  DOG: "🐕", CAT: "🐈", RABBIT: "🐇", BIRD: "🦜", OTHER: "🐾",
};

const SIZE_LABELS: Record<string, string> = {
  SMALL: "Kis",  MEDIUM: "Közepes", LARGE: "Nagy", EXTRA_LARGE: "Extra nagy",
};

interface AnimalCardProps {
  animal: {
    id: string;
    slug: string;
    name: string;
    type: AnimalType;
    breed: string | null;
    age: number | null;
    size: string | null;
    gender: string | null;
    status: AnimalStatus;
    images: { url: string; alt: string | null }[];
    shelter: { name: string; city: string };
  };
}

function formatAge(months: number | null) {
  if (!months) return null;
  if (months < 12) return `${months} hó`;
  const years = Math.floor(months / 12);
  const rem   = months % 12;
  return rem > 0 ? `${years} év ${rem} hó` : `${years} év`;
}

export function AnimalCard({ animal }: AnimalCardProps) {
  const status  = STATUS_LABELS[animal.status];
  const imgUrl  = animal.images[0]?.url ?? "/placeholder-animal.jpg";
  const imgAlt  = animal.images[0]?.alt ?? animal.name;

  return (
    <Link href={`/animals/${animal.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Kép */}
        <div className="relative h-52 w-full overflow-hidden bg-gray-100">
          <Image
            src={imgUrl}
            alt={imgAlt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Státusz badge */}
          <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
            {status.label}
          </span>
          {/* Típus emoji */}
          <span className="absolute right-3 top-3 text-xl">
            {TYPE_EMOJI[animal.type]}
          </span>
        </div>

        {/* Tartalom */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">
            {animal.name}
          </h3>
          {animal.breed && (
            <p className="mt-0.5 text-sm text-gray-500">{animal.breed}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
            {animal.gender && (
              <span className="flex items-center gap-1">
                <span className={animal.gender === "MALE" ? "text-blue-400" : "text-pink-400"}>
                  {animal.gender === "MALE" ? "♂" : "♀"}
                </span>
                {animal.gender === "MALE" ? "Hím" : "Nőstény"}
              </span>
            )}
            {animal.age && (
              <span>{formatAge(animal.age)}</span>
            )}
            {animal.size && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" />
                {SIZE_LABELS[animal.size] ?? animal.size}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{animal.shelter.city} · {animal.shelter.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
