import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimalType, AnimalStatus } from "@prisma/client";

const STATUS_LABELS: Record<AnimalStatus, { label: string; color: string }> = {
  AVAILABLE:    { label: "Örökbefogadható", color: "bg-emerald-100 text-emerald-700" },
  PENDING:      { label: "Folyamatban",     color: "bg-amber-100 text-amber-700"     },
  ADOPTED:      { label: "Örökbefogadott",  color: "bg-sky-100 text-sky-700"         },
  FOSTER:       { label: "Ideiglenes",      color: "bg-violet-100 text-violet-700"   },
  MEDICAL_HOLD: { label: "Kezelés alatt",   color: "bg-rose-100 text-rose-700"       },
};

const TYPE_LABELS: Record<AnimalType, string> = {
  DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb",
};

const SIZE_LABELS: Record<string, string> = {
  SMALL: "Kis", MEDIUM: "Közepes", LARGE: "Nagy", EXTRA_LARGE: "Extra nagy",
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

const GENDER_LABEL: Record<string, string> = {
  MALE: "Hím", FEMALE: "Nőstény", UNKNOWN: "Ismeretlen",
};

export function AnimalCard({ animal }: AnimalCardProps) {
  const status = STATUS_LABELS[animal.status];
  const imgUrl = animal.images[0]?.url ?? "/placeholder-animal.jpg";
  const imgAlt = animal.images[0]?.alt ?? animal.name;
  const age    = formatAge(animal.age);
  const gender = animal.gender ? GENDER_LABEL[animal.gender] : null;

  return (
    <Link href={`/animals/${animal.slug}`} className="group flex flex-col">
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">

        {/* Image */}
        <div className="relative h-52 w-full overflow-hidden bg-gray-100">
          <Image
            src={imgUrl}
            alt={imgAlt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Status badge */}
          <span className={cn(
            "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm",
            status.color,
          )}>
            {status.label}
          </span>

          {/* Type badge */}
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
            {TYPE_LABELS[animal.type]}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-600">
              {animal.name}
            </h3>
            {animal.breed && (
              <p className="mt-0.5 text-sm text-gray-400">{animal.breed}</p>
            )}
          </div>

          {/* Tags */}
          {(gender || age || animal.size) && (
            <div className="flex flex-wrap gap-1.5">
              {gender && (
                <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                  {gender}
                </span>
              )}
              {age && (
                <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                  {age}
                </span>
              )}
              {animal.size && (
                <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                  {SIZE_LABELS[animal.size] ?? animal.size}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-xs text-gray-400">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{animal.shelter.city}</span>
            </div>
            <span className="shrink-0 text-xs font-semibold text-brand-500 transition-colors group-hover:text-brand-700">
              Részletek →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
