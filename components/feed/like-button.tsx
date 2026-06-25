"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  postId:       string;
  initialCount: number;
  initialLiked: boolean;
}

export function LikeButton({ postId, initialCount, initialLiked }: LikeButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!session?.user?.id) {
      router.push("/auth/login");
      return;
    }
    if (pending) return;

    // Optimista frissítés
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));
    setPending(true);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      toast.error("Nem sikerült a művelet");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={liked ? "Kedvelés visszavonása" : "Kedvelés"}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
        liked ? "text-rose-600 hover:bg-rose-50" : "text-gray-500 hover:bg-gray-100 hover:text-rose-600"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-rose-600")} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
