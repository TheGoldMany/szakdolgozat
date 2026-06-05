import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StarRating } from "./star-rating";
import { ReviewCard } from "./review-card";
import { ReviewForm } from "./review-form";

interface Props { targetUserId: string }

export async function UserReviews({ targetUserId }: Props) {
  const [session, reviews] = await Promise.all([
    getServerSession(authOptions),
    prisma.review.findMany({
      where:   { targetUserId },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  const isSelf          = session?.user?.id === targetUserId;
  const alreadyReviewed = reviews.some(r => r.author.id === session?.user?.id);
  const canReview       = !!session?.user?.id && !isSelf && !alreadyReviewed;

  return (
    <section className="mt-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          Értékelések
          <span className="ml-2 text-sm font-normal text-gray-400">({reviews.length})</span>
        </h2>
        {avg !== null && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(avg)} readonly size="sm" />
            <span className="text-lg font-bold text-gray-900">{avg.toFixed(1)}</span>
          </div>
        )}
      </div>

      {canReview && (
        <div className="mb-6">
          <ReviewForm targetUserId={targetUserId} />
        </div>
      )}

      {!session?.user && (
        <p className="mb-4 text-sm text-gray-500">
          <a href="/auth/login" className="text-brand-500 underline">Jelentkezz be</a> az értékeléshez.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          Még nincs értékelés.
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <ReviewCard
              key={r.id}
              review={{ ...r, createdAt: r.createdAt.toISOString() }}
              currentUserId={session?.user?.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
