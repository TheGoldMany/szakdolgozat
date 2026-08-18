"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  subscriptionId: string;
}

/**
 * Előfizetés rekord végleges törlése (csak SUPER_ADMIN, nem ACTIVE rekordon).
 * Aktív előfizetést a szerver 409-cel utasít el — az indoklást megjelenítjük.
 */
export function SubscriptionDeleteButton({ subscriptionId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Biztosan véglegesen törlöd ezt az előfizetési rekordot?")) return;

    setLoading(true);
    try {
      const res  = await fetch(`/api/subscriptions/${subscriptionId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "A törlés nem sikerült.");
        return;
      }
      toast.success("Az előfizetés törölve.");
      router.refresh();
    } catch {
      toast.error("A törlés nem sikerült.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title="Előfizetési rekord törlése"
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Törlés
    </button>
  );
}
