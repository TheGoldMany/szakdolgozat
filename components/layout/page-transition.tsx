"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Oldalváltás-animáció.
 *
 * Telefonon az oldalak egymás mellett élnek a fejünkben: előre lépve balra
 * tolódik a régi, vissza lépve jobbra. Ha az új oldal csak felvillan, semmi
 * nem mondja meg, merre haladunk. Ezért az új tartalom becsúszik – előre
 * jobbról, vissza balról –, asztali gépen pedig csak finoman felúszik, mert
 * ott az egérrel navigálás nem "lapozás".
 *
 * A kulcs a pathname: így a szűrők átállítása (ami csak a query stringet
 * írja át) NEM indítja újra az animációt, csak a tényleges oldalváltás.
 *
 * Az animációnak szándékosan nincs `fill-mode`-ja. A `forwards`/`both` a
 * végállapotot rajta hagyná az elemen, a megmaradó `transform` pedig
 * pozicionálási kerete lenne minden `position: fixed` gyerekének – onnantól
 * a lapon belüli felugró ablakok nem a képernyőhöz igazodnának.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  /** Igaz, ha a következő váltás a böngésző Vissza/Előre gombjától jön. */
  const popped = useRef(false);
  const [renderedPath, setRenderedPath] = useState(pathname);
  /** null = friss betöltés, még nem volt lapozás. */
  const [dir, setDir] = useState<"forward" | "back" | null>(null);

  useEffect(() => {
    const onPop = () => { popped.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Az irányt még renderelés közben eldöntjük. Effektben késő lenne: az első
  // képkocka a régi iránnyal indulna el, majd váltana – ez látható ugrás.
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setDir(popped.current ? "back" : "forward");
    popped.current = false;
  }

  // Az első betöltés nem lapozás, ezért nem is animáljuk: nincs mihez képest
  // "becsúszni", a beúszó tartalom viszont kitolná a legnagyobb tartalmi elem
  // megjelenését is.
  return (
    <div key={pathname} className={dir === "back" ? "page-enter-back" : dir === "forward" ? "page-enter" : undefined}>
      {children}
    </div>
  );
}
