"use client";

import { HelpCircle } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { startTour } from "@/components/onboarding/tour";
import { tourForPath } from "@/lib/tours";
import { cn } from "@/lib/utils";

/**
 * „Bemutató” gomb a fejlécben.
 *
 * MIÉRT KELL: a bemutató magától csak EGYSZER indul el, és utána a „láttam"
 * jelzés miatt soha többé. Enélkül aki elsőre átkattintott rajta, sosem tudná
 * újranézni — és épp ő az, akinek később szüksége lenne rá.
 *
 * Csak akkor jelenik meg, ha az adott oldalhoz VAN bemutató. Egy mindig látszó,
 * de a fele oldalon nem működő gomb rosszabb, mint ha nincs ott.
 */
export function TourButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const tour = tourForPath(pathname);

  if (!tour) return null;

  return (
    <button
      onClick={() => startTour(tour.id)}
      aria-label={`Bemutató: ${tour.title}`}
      title={`Bemutató: ${tour.title}`}
      className={cn(
        "flex items-center rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-500",
        className,
      )}
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}
