"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";

interface Shelter { id: string; name: string }
interface Animal  { id: string; name: string; breed: string | null }

export function NewCampaignForm({ stripeConnected }: { stripeConnected: boolean }) {
  const t       = useTranslations("donate");
  const tCommon = useTranslations("common");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [shelterId, setShelterId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!stripeConnected) return;
    fetch("/api/shelters/list")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setShelters(data); })
      .catch(() => {});
  }, [stripeConnected]);

  // Load the selected shelter's animals for the optional animal link
  useEffect(() => {
    setAnimalId("");
    setAnimals([]);
    if (!shelterId) return;
    setAnimalsLoading(true);
    fetch(`/api/animals?shelterId=${shelterId}&status=AVAILABLE&limit=100`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data?.animals)) setAnimals(data.animals); })
      .catch(() => {})
      .finally(() => setAnimalsLoading(false));
  }, [shelterId]);

  async function connectStripe() {
    setStripeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "user" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("stripeConnectError"));
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("unknownError"));
      setStripeLoading(false);
    }
  }

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
      setError(t("newCoverFailed"));
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseInt(targetAmount, 10);
    if (!title.trim()) { setError(t("newTitleRequired")); return; }
    if (!description.trim()) { setError(t("newDescRequired")); return; }
    if (isNaN(parsed) || parsed < 1000) { setError(t("newTargetMin")); return; }

    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        targetAmount: parsed,
      };
      if (shelterId) body.shelterId = shelterId;
      if (animalId)  body.animalId  = animalId;
      if (imageUrl)  body.imageUrl  = imageUrl;
      if (endsAt)    body.endsAt    = new Date(endsAt).toISOString();

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("newSubmitError"));
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("unknownError"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-500" />
        <h2 className="text-xl font-bold text-gray-900">{t("newSubmitted")}</h2>
        <p className="text-sm text-gray-600">
          {t("newSubmittedDesc")}
        </p>
      </div>
    );
  }

  // Stripe nincs bekötve → nem indítható gyűjtés
  if (!stripeConnected) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <CreditCard className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">{t("stripeRequired")}</h2>
        <p className="text-sm text-gray-600">
          {t("stripeRequiredDesc")}
        </p>
        <button
          type="button"
          onClick={connectStripe}
          disabled={stripeLoading}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {stripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {t("stripeConnectOwn")}
        </button>
        <p className="text-xs text-gray-500">
          Menhely adminként a menhelyed Stripe fiókját a{" "}
          <a href="/dashboard/settings" className="font-medium text-brand-600 hover:underline">Menhely beállításoknál</a>{" "}
          kötheted be — onnantól a menhelyedért indíthatsz gyűjtést.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("newTitle")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder={t("newTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("newDescription")} <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={5}
          required
          placeholder={t("newDescriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 resize-none"
        />
      </div>

      {/* Target amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("newTarget")} <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          required
          min={1000}
          step={500}
          placeholder={t("newTargetPlaceholder")}
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("newCover")}</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={imageUploading}
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 disabled:opacity-50"
        />
        {imageUploading && <p className="mt-1 text-xs text-gray-400">{tCommon("uploading")}</p>}
        {imageUrl && !imageUploading && (
          <p className="mt-1 text-xs text-brand-600">{t("newCoverUploaded")}</p>
        )}
      </div>

      {/* End date */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("newEndsAt")}
        </label>
        <input
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Shelter select – OPTIONAL */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("newShelter")} <span className="text-gray-400">({tCommon("optional")})</span>
        </label>
        <select
          value={shelterId}
          onChange={(e) => setShelterId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 bg-white"
        >
          <option value="">{t("newShelterNone")}</option>
          {shelters.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Animal select – OPTIONAL, only when a shelter is chosen */}
      {shelterId && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("newAnimal")} <span className="text-gray-400">({tCommon("optional")})</span>
          </label>
          <select
            value={animalId}
            onChange={(e) => setAnimalId(e.target.value)}
            disabled={animalsLoading}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 bg-white disabled:opacity-60"
          >
            <option value="">{t("newAnimalNone")}</option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}{a.breed ? ` – ${a.breed}` : ""}
              </option>
            ))}
          </select>
          {animalsLoading && <p className="mt-1 text-xs text-gray-400">{t("newAnimalsLoading")}</p>}
          {!animalsLoading && animals.length === 0 && (
            <p className="mt-1 text-xs text-gray-400">{t("newAnimalsEmpty")}</p>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        {t("newSubmit")}
      </Button>
    </form>
  );
}
