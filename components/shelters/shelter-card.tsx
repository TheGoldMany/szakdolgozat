import Link from "next/link";
import Image from "next/image";
import { MapPin, PawPrint } from "lucide-react";

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

export function ShelterCard({ shelter }: ShelterCardProps) {
  return (
    <Link href={`/shelters/${shelter.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
        {/* Logó sáv */}
        <div className="flex h-28 items-center justify-center bg-gray-50">
          {shelter.logoUrl ? (
            <Image
              src={shelter.logoUrl}
              alt={shelter.name}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
              <PawPrint className="h-10 w-10 text-brand-400" />
            </div>
          )}
        </div>

        {/* Tartalom */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-brand-500 transition-colors leading-tight">
              {shelter.name}
            </h3>
            {shelter.isVerified && (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                ✓ Ellenőrzött
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{shelter.city}</span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
            <PawPrint className="h-3.5 w-3.5" />
            <span>{shelter.address}</span>
          </div>

          <div className="mt-3 rounded-lg bg-brand-50 px-3 py-1.5 text-center text-sm font-medium text-brand-600">
            {shelter._count.animals} állat vár gazdira
          </div>
        </div>
      </div>
    </Link>
  );
}
