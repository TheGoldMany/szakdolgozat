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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
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
        shown ? (stagger ? "stagger" : "animate-fade-in-up") : "opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
