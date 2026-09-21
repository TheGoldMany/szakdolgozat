"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { Tour } from "@/components/onboarding/tour";
import { tourForPath } from "@/lib/tours";
import { hasSeenTour, markTourSeen } from "@/lib/tour-seen";

/**
 * Az aktuális oldal bemutatója.
 *
 * EGYETLEN példány van belőle, az elrendezésben — nem oldalanként beépítve. Így
 * új bemutatóhoz elég a `lib/tours.ts`-t bővíteni, az oldalhoz nem kell
 * hozzányúlni, és nem fordulhat elő, hogy egy oldalról kimarad.
 *
 * A „láttam már" állapotot csak a böngészőben tudjuk eldönteni, ezért a
 * beolvasás egy effektben történik, nem renderelés közben: a szerveren
 * futó első renderelésnek ugyanazt kell adnia, mint a kliensen, különben a
 * hidratálás elromlik.
 */
export function PageTour() {
  const pathname = usePathname();
  const params   = useSearchParams();
  const tour = tourForPath(pathname);

  /**
   * A Súgó `?bemutato=1`-gyel hivatkozik ide. Ilyenkor akkor is elindul, ha a
   * felhasználó már látta — épp azért kattintott rá, hogy újranézze.
   */
  const forced = params.get("bemutato") === "1";

  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    if (!tour) { setAutoStart(false); return; }
    setAutoStart(forced || !hasSeenTour(tour.id, tour.version));
  }, [tour, forced]);

  const onSeen = useCallback(() => {
    if (tour) markTourSeen(tour.id, tour.version);
  }, [tour]);

  if (!tour) return null;

  // A `key` miatt oldalváltáskor új példány jön létre: enélkül az előző oldal
  // lépésénél maradt belső állapot (index, kiemelés) átcsordulna az újra.
  return <Tour key={tour.id} tour={tour} autoStart={autoStart} onSeen={onSeen} />;
}
