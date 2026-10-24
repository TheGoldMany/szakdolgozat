"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Teljes képernyős képnagyító a galériákhoz (bejelentés, állat adatlapja).
 *
 * Két darabból áll, hogy a meglévő szerveroldali galéria-markup maradhasson:
 * a `LightboxProvider` tartja a képlistát és a nagyítót, a `LightboxTrigger`
 * pedig bármelyik képet kattinthatóvá teszi a saját sorszámával. Egy elveszett
 * állat bejelentésénél a részletek (nyakörv, folt, sebhely) a kis képen nem
 * látszanak, ezért kell a nagyítás.
 */

export interface LightboxImage { url: string; alt: string }

const OpenContext = createContext<(index: number) => void>(() => {});

export function LightboxProvider({ images, children }: { images: LightboxImage[]; children: React.ReactNode }) {
  const t = useTranslations("common");
  const [index, setIndex] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const step  = useCallback((dir: 1 | -1) =>
    setIndex((i) => (i === null ? i : (i + dir + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")     close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft")  step(-1);
    };
    window.addEventListener("keydown", onKey);
    // A háttér ne görögjön a nagyított kép mögött.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, close, step]);

  const current = index === null ? null : images[index];
  const many    = images.length > 1;
  const navBtn  = "absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <OpenContext.Provider value={setIndex}>
      {children}
      {current && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95"
          role="dialog" aria-modal="true" aria-label={current.alt}
          onClick={close}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null || !many) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
            <Image src={current.url} alt={current.alt} fill sizes="100vw" className="object-contain" priority />
          </div>

          <button type="button" onClick={close} aria-label={t("imageClose")}
            className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] rounded-full bg-black/40 p-2 text-white hover:bg-black/60">
            <X className="h-6 w-6" />
          </button>

          {many && (
            <>
              <button type="button" aria-label={t("imagePrev")} className={cn(navBtn, "left-3")}
                onClick={(e) => { e.stopPropagation(); step(-1); }}>
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button type="button" aria-label={t("imageNext")} className={cn(navBtn, "right-3")}
                onClick={(e) => { e.stopPropagation(); step(1); }}>
                <ChevronRight className="h-7 w-7" />
              </button>
              <p className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                {index! + 1} / {images.length}
              </p>
            </>
          )}
        </div>,
        document.body,
      )}
    </OpenContext.Provider>
  );
}

/** Egy galériakép kattintható felülete. A szülő legyen `relative`, a kép `fill`. */
export function LightboxTrigger({ index, label, hint = false, children }: {
  index: number; label: string; hint?: boolean; children: React.ReactNode;
}) {
  const open = useContext(OpenContext);
  return (
    <button type="button" onClick={() => open(index)} aria-label={label}
      className="group absolute inset-0 block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      {children}
      {hint && (
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/50 p-1.5 text-white transition-opacity group-hover:bg-black/70" aria-hidden>
          <Maximize2 className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}
