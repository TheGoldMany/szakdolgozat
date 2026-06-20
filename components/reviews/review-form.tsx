"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { StarRating } from "./star-rating";

interface Props {
  shelterId?:    string;
  targetUserId?: string;
}

export function ReviewForm({ shelterId, targetUserId }: Props) {
  const t = useTranslations('reviews');
  const router = useRouter();
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [ratingError, setRatingError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setRatingError(true); return; }
    setRatingError(false);
    setLoading(true);

    try {
      const res  = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelterId, targetUserId, rating, comment: comment || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Hiba történt");
        return;
      }

      toast.success("Értékelésed sikeresen elküldve!");
      setRating(0);
      setComment("");
      router.refresh();
    } catch {
      toast.error("Hálózati hiba, próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-gray-900">Értékelés írása</h3>

      <div className="mb-4">
        <p className="mb-1.5 text-xs font-medium text-gray-500">Csillagok *</p>
        <StarRating value={rating} onChange={(v) => { setRating(v); setRatingError(false); }} size="lg" />
        {ratingError && <p className="mt-1 text-xs text-red-500">Adj meg csillagos értékelést!</p>}
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-medium text-gray-500">
          Vélemény (opcionális)
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Oszd meg tapasztalataidat…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{comment.length}/1000</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {loading ? t('submitting') : t('submitReview')}
      </button>
    </form>
  );
}
