"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Props {
  animalId:         string;
  initialFavorited: boolean;
  variant?:         "overlay" | "button";
  /** When the favorite is removed (used on the favorites page to drop the card). */
  onRemoved?:       () => void;
}

export function FavoriteButton({ animalId, initialFavorited, variant = "overlay", onRemoved }: Props) {
  const t = useTranslations("animals");
  const router = useRouter();
  const { status } = useSession();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading,   setLoading]   = useState(false);

  async function toggle(e: React.MouseEvent) {
    // The button often sits inside a <Link>; don't navigate.
    e.preventDefault();
    e.stopPropagation();

    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    if (loading) return;

    const next = !favorited;
    setFavorited(next);          // optimistic
    setLoading(true);
    try {
      const res = next
        ? await fetch("/api/favorites", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ animalId }),
          })
        : await fetch(`/api/favorites/${animalId}`, { method: "DELETE" });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        setFavorited(!next);     // revert
        toast.error(t("favoriteError"));
        return;
      }
      toast.success(next ? t("favoriteAddedToast") : t("favoriteRemovedToast"));
      if (!next) onRemoved?.();
    } catch {
      setFavorited(!next);       // revert on network error
      toast.error(t("favoriteError"));
    } finally {
      setLoading(false);
    }
  }

  const label = favorited ? t("favoriteRemove") : t("favoriteAdd");

  if (variant === "button") {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={label}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-colors disabled:opacity-60",
          favorited
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        )}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Heart className={cn("h-4 w-4", favorited && "fill-rose-500 text-rose-500")} />}
        {label}
      </button>
    );
  }

  // overlay variant — circular icon over the card image
  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={label}
      title={label}
      className={cn(
        "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-70",
      )}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        : <Heart className={cn("h-4 w-4 transition-colors", favorited ? "fill-rose-500 text-rose-500" : "text-gray-500")} />}
    </button>
  );
}
