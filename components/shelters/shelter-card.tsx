import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { MapPin, PawPrint, BadgeCheck, Star, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface ShelterCardProps {
  shelter: {
    id: string;
    slug: string;
    name: string;
    city: string;
    logoUrl: string | null;
    isVerified: boolean;
    _count: { animals: number };
  };
  /** Az örökbefogadható állatok első néhány fotója (lehet üres). */
  thumbs: string[];
  rating: { avg: number; count: number } | null;
}

/**
 * Menhely a listában.
 *
 * Mobilon tömör sor (logó, név, város, hány állat vár), hogy egy képernyőn
 * több menhely látsszon; nagyobb képernyőn kártya. Az állatok kis fotói csak
 * akkor jelennek meg, ha van feltöltött állat: a kártya a kínálattal együtt
 * telik meg, üresen nem mutat helyőrzőket.
 */
export async function ShelterCard({ shelter, thumbs, rating }: ShelterCardProps) {
  const t = await getTranslations("shelters");
  const count = shelter._count.animals;

  return (
    <Link href={`/shelters/${shelter.slug}`}
      className="press-card group flex flex-col rounded-xl border border-gray-200 bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:h-14 sm:w-14">
          {shelter.logoUrl
            ? <Image src={shelter.logoUrl} alt="" fill className="object-cover" sizes="56px" />
            : <span className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-brand-700">{shelter.name[0]}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-700">
            {shelter.name}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{shelter.city}</span>
            {shelter.isVerified && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-sky-600">
                <BadgeCheck className="h-3.5 w-3.5" />{t("verified")}
              </span>
            )}
            {rating && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold text-gray-700">{rating.avg.toFixed(1)}</span>
                <span className="text-gray-400">({rating.count})</span>
              </span>
            )}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-brand-600" />
      </div>

      {thumbs.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {thumbs.slice(0, 4).map((url, i) => (
            <div key={url + i} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image src={url} alt="" fill className="object-cover" sizes="(max-width:640px) 22vw, 80px" />
            </div>
          ))}
        </div>
      )}

      <p className={`mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${count > 0 ? "bg-brand-50 text-brand-800" : "bg-gray-50 text-gray-500"}`}>
        <PawPrint className="h-3.5 w-3.5 shrink-0" />
        {count > 0 ? t("animalsWaitingCount", { count }) : t("noAnimalsYet")}
      </p>
    </Link>
  );
}
