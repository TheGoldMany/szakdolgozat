"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";

/**
 * Mai kép feltöltése.
 *
 * A képet a `ImageUpload` teszi fel közvetlenül a tárolóba (Vercel Blob), és
 * csak a kész URL-t küldjük a saját végpontunknak. Így a nagy fájl nem megy át
 * a szerverünkön, és a feltöltés akkor sem szakad meg, ha a lista közben
 * újratöltődik.
 */
export function DailyComposer({ onPosted }: { onPosted: () => void }) {
  const t = useTranslations("daily");
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption]   = useState("");
  const [busy, setBusy]         = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl) {
      toast.error(t("composeNeedImage"));
      return;
    }
    setBusy(true);
    try {
      const res  = await fetch("/api/daily-posts", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl, caption: caption.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : t("networkError"));
        return;
      }
      toast.success(t("composeDone"));
      setImageUrl("");
      setCaption("");
      onPosted();
    } catch {
      toast.error(t("networkError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-800">{t("composeTitle")}</h3>

      <ImageUpload value={imageUrl} onChange={setImageUrl} label={t("composeOpen")} />

      <div>
        <label htmlFor="daily-caption" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("composeCaption")}
        </label>
        <textarea
          id="daily-caption"
          rows={2}
          maxLength={500}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("composeCaptionPlaceholder")}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <Button type="submit" loading={busy} disabled={!imageUrl} className="w-full">
        {busy ? t("composeSubmitting") : t("composeSubmit")}
      </Button>
    </form>
  );
}
