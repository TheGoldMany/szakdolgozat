"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroSlide {
  url:         string;
  name:        string;
  slug:        string;
  shelterName: string;
}

/**
 * A legutóbb feltöltött állatok fotóiból álló automatikus diavetítés a hero-ban.
 * Kereszthalványítás (fade) + lassú ráközelítés (Ken Burns), ~4,5 mp-enként vált.
 */
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % slides.length), 4500);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-brand-50">
        <PawPrint className="h-28 w-28 text-brand-100" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-xl">
      {slides.map((s, idx) => (
        <Link
          key={s.slug}
          href={`/animals/${s.slug}`}
          aria-hidden={idx !== active}
          tabIndex={idx === active ? 0 : -1}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-in-out",
            idx === active ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Image
            src={s.url}
            alt={s.name}
            fill
            priority={idx === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-[5000ms] ease-out",
              idx === active ? "scale-110" : "scale-100",
            )}
          />
          {/* Caption overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 pt-10">
            <p className="text-lg font-bold text-white drop-shadow">{s.name}</p>
            <p className="text-sm text-white/80">{s.shelterName}</p>
          </div>
        </Link>
      ))}

      {/* Progress dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={`${idx + 1}. állat`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === active ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
