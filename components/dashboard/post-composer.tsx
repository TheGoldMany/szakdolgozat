"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

interface Option { id: string; label: string }

interface PostComposerProps {
  shelterId: string;
  animals:   Option[];
  events:    Option[];
  campaigns: Option[];
}

export function PostComposer({ shelterId, animals, events, campaigns }: PostComposerProps) {
  const router = useRouter();
  const [content, setContent]   = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [animalId, setAnimalId]     = useState("");
  const [eventId, setEventId]       = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { toast.error("Írj valamit a poszthoz"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelterId,
          content: content.trim(),
          imageUrl: imageUrl || undefined,
          animalId: animalId || undefined,
          eventId: eventId || undefined,
          campaignId: campaignId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Hiba történt"); return; }
      toast.success("Poszt közzétéve");
      setContent(""); setImageUrl(""); setAnimalId(""); setEventId(""); setCampaignId("");
      router.refresh();
    } catch {
      toast.error("Hálózati hiba");
    } finally {
      setLoading(false);
    }
  }

  const selectClass = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Mi újság a menhelyen? Oszd meg a közösséggel…"
        className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
      />
      <p className="mt-1 text-right text-xs text-gray-400">{content.length}/2000</p>

      <div className="mt-3">
        <ImageUpload value={imageUrl} onChange={setImageUrl} label="Kép (opcionális)" />
      </div>

      {/* Opcionális hivatkozások */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Állat</label>
          <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} className={selectClass}>
            <option value="">– nincs –</option>
            {animals.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Esemény</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectClass}>
            <option value="">– nincs –</option>
            {events.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Gyűjtés</label>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={selectClass}>
            <option value="">– nincs –</option>
            {campaigns.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" loading={loading}>
          <Send className="h-4 w-4" /> Közzététel
        </Button>
      </div>
    </form>
  );
}
