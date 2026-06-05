import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface RatingStatProps {
  avg: number | null;
  count: number;
  className?: string;
  /** Mit írjon ki, ha még nincs értékelés. Alapértelmezés: "Nincs értékelés". */
  emptyLabel?: string;
  /** Ha nincs értékelés, ne jelenítsen meg semmit. */
  hideWhenEmpty?: boolean;
}

/**
 * Kompakt értékelés-jelvény: sárga csillag + átlag + (darabszám).
 * Bárhol megjeleníthető, ahol egy profil (menhely / felhasználó) feltűnik.
 * Tisztán prezentációs – előre kiszámolt átlagot és darabszámot vár,
 * így listákban N+1 lekérdezés nélkül használható.
 */
export function RatingStat({ avg, count, className, emptyLabel, hideWhenEmpty }: RatingStatProps) {
  if (count === 0) {
    if (hideWhenEmpty) return null;
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-gray-400", className)}>
        <Star className="h-3.5 w-3.5 text-gray-300" />
        {emptyLabel ?? "Nincs értékelés"}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-xs font-semibold text-gray-700">{(avg ?? 0).toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count})</span>
    </span>
  );
}

interface RatingBadgeProps {
  shelterId?: string;
  targetUserId?: string;
  className?: string;
  emptyLabel?: string;
  hideWhenEmpty?: boolean;
}

/**
 * Önállóan lekérdező szerver-változat egyetlen profilhoz (menhely VAGY user).
 * Egy elemnél kényelmes; listáknál inkább a RatingStat-ot használd
 * előre, kötegelt groupBy-jal kiszámolt értékekkel.
 */
export async function RatingBadge({ shelterId, targetUserId, ...rest }: RatingBadgeProps) {
  const where = shelterId ? { shelterId } : { targetUserId };
  const agg = await prisma.review.aggregate({
    where,
    _avg:   { rating: true },
    _count: { rating: true },
  });
  return <RatingStat avg={agg._avg.rating} count={agg._count.rating} {...rest} />;
}
