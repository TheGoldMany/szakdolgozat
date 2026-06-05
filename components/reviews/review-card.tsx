"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "./star-rating";

interface ReviewCardProps {
  review: {
    id:      string;
    rating:  number;
    comment: string | null;
    createdAt: string | Date;
    author:  { id: string; name: string | null; image: string | null };
  };
  currentUserId?: string;
}

export function ReviewCard({ review, currentUserId }: ReviewCardProps) {
  const router  = useRouter();
  const [deleting, setDeleting] = useState(false);
  const isOwn = currentUserId === review.author.id;

  async function handleDelete() {
    if (!confirm("Biztosan törlöd az értékelésedet?")) return;
    setDeleting(true);
    await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {review.author.image ? (
            <Image
              src={review.author.image}
              alt={review.author.name ?? ""}
              width={36} height={36}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
              {review.author.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">{review.author.name ?? "Névtelen"}</p>
            <p className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString("hu-HU")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StarRating value={review.rating} readonly size="sm" />
          {isOwn && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {review.comment && (
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{review.comment}</p>
      )}
    </div>
  );
}
