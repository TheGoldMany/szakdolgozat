"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children:  React.ReactNode;
  className?: string;
  /** Késleltetés ms-ban, ha egymás után több blokk jelenik meg. */
  delay?:    number;
  /** `true` esetén a gyerekek egymás után jelennek meg (rácsokhoz, listákhoz). */
  stagger?:  boolean;
}

/**
 * Görgetésre megjelenő blokk: amikor beér a nézetbe, finoman felúszik.
 *
 * Csak egyszer fut le, és `IntersectionObserver` nélküli környezetben
 * (vagy ha az nem támogatott) azonnal láthatóvá teszi a tartalmat, hogy
 * semmiképp ne maradjon rejtve.
 *
 * A megjelenés előtti rejtés a `reveal-pending` osztállyal történik, nem
 * `opacity-0`-val: kikapcsolt JavaScript mellett az `app/layout.tsx`-ben lévő
 * `<noscript>` szabály visszakapcsolja a láthatóságot. Enélkül a tartalom
 * örökre rejtve maradna azoknál, akiknél a megfigyelő sosem indul el.
 */
export function Reveal({ children, className, delay = 0, stagger = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // threshold 0: elég, ha a blokk BELELÓG a nézetbe. Aránnyal (pl. 0.05)
      // nem működne: egy hosszú kártyarács 5%-a több képernyőnyi is lehet,
      // amit soha nem lehet egyszerre látni – a tartalom örökre rejtve maradna.
      // A -10% alsó margó tolja el a pillanatot, amíg tényleg beér a képbe.
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        // Megjelenés előtt átlátszó, de a helyét már elfoglalja (nincs ugrálás)
        shown ? (stagger ? "stagger" : "animate-fade-in-up") : "reveal-pending",
        className,
      )}
    >
      {children}
    </div>
  );
}
