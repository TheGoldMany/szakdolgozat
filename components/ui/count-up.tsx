"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value:     number;
  /** Teljes futásidő ms-ban. */
  duration?: number;
  className?: string;
}

/**
 * Számláló, ami 0-ról felszámol a végértékig, amikor a nézetbe ér.
 *
 * Ha a felhasználó csökkentett mozgást kért, azonnal a végértéket mutatja —
 * a szám az információ, az animáció csak ráadás.
 */
export function CountUp({ value, duration = 900, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    const run = () => {
      if (started.current) return;
      started.current = true;

      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // lassuló vég, hogy ne "csapódjon" a végértékre
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(value * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("hu-HU")}
    </span>
  );
}
