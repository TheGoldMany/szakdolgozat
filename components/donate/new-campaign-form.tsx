"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface Shelter {
  id: string;
  name: string;
}

export function NewCampaignForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [shelterId, setShelterId] = useState("");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/shelters/list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setShelters(data);
      })
      .catch(() => {
        // shelters list endpoint may not be available – silently skip
      });
  }, []);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setError(null);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const blob = await upload(`campaign-${Date.now()}.${ext}`, file, {
        access:          "public",
        handleUploadUrl: "/api/upload/avatar",
      });
      setImageUrl(blob.url);
    } catch {
      setError("A kép feltöltése sikertelen volt.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(targetAmount, 10);
    if (!title.trim()) { setError("A cím megadása kötelező."); return; }
    if (!description.trim()) { setError("A leírás megadása kötelező."); return; }
    if (isNaN(parsed) || parsed < 1000) { setError("A célösszeg minimum 1 000 Ft legyen."); return; }
    if (!shelterId) { setError("Kérjük válassz egy menhelyt."); return; }

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        targetAmount: parsed,
        shelterId,
      };
      if (imageUrl) body.imageUrl = imageUrl;
      if (endsAt) body.endsAt = new Date(endsAt).toISOString();

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Hiba a beküldés közben.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ismeretlen hiba.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-500" />
        <h2 className="text-xl font-bold text-gray-900">Gyűjtésed beküldve!</h2>
        <p className="text-sm text-gray-600">
          Gyűjtésed admin jóváhagyásra vár. Értesítünk, amint elfogadják.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Gyűjtés címe <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="pl. Mentsd meg Bodrit!"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Leírás <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={5}
          required
          placeholder="Miért indítod a gyűjtést? Mire fordítod az összeget?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none"
        />
      </div>

      {/* Target amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Célösszeg (Ft) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          min={1000}
          step={500}
          placeholder="pl. 50000"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Borítókép (opcionális)</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={imageUploading}
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 disabled:opacity-50"
        />
        {imageUploading && <p className="mt-1 text-xs text-gray-400">Feltöltés…</p>}
        {imageUrl && !imageUploading && (
          <p className="mt-1 text-xs text-brand-600">Kép sikeresen feltöltve.</p>
        )}
      </div>

      {/* End date */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Gyűjtés vége (opcionális)
        </label>
        <input
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Shelter select – required */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Melyik menhelyért gyűjtesz? <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={shelterId}
          onChange={(e) => setShelterId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 bg-white"
        >
          <option value="">– Válassz menhelyt –</option>
          {shelters.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {shelters.length === 0 && (
          <p className="mt-1 text-xs text-gray-400">Menhelyek betöltése…</p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Gyűjtés beküldése
      </Button>
    </form>
  );
}
