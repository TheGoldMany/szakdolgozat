"use client";

import { useEffect, useRef, useState } from "react";
import { ArticleSeoPanel, type SeoFields } from "@/components/dashboard/article-seo-panel";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import {
  Loader2, ImagePlus, X, Save, Send, EyeOff, Trash2, AlertCircle, FilePlus2, CalendarClock } from "lucide-react";

/** Egy szerkesztésre megnyitott cikk kiindulási adatai. */
export interface EditableArticle {
  id:        string;
  title:     string;
  excerpt:   string | null;
  content:   string;
  imageUrl:  string | null;
  shelterId: string | null;
  published: boolean;
  /** ISO időpont, ha van megjelenési idő (múltbeli = publikált, jövőbeli = időzített). */
  publishedAt: string | null;
  slug:            string | null;
  seoTitle:        string | null;
  metaDescription: string | null;
  focusKeyword:    string | null;
  keywords:        string[];
  tags:            string[];
}

interface ShelterOption { id: string; name: string }

const cls =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

const EXCERPT_MAX = 400;

/** Date -> a <input type="datetime-local"> által várt helyi idő szerinti szöveg. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ArticleEditor({ article }: { article?: EditableArticle | null }) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle]         = useState(article?.title ?? "");
  const [excerpt, setExcerpt]     = useState(article?.excerpt ?? "");
  const [content, setContent]     = useState(article?.content ?? "");
  const [imageUrl, setImageUrl]   = useState(article?.imageUrl ?? "");
  const [shelterId, setShelterId] = useState(article?.shelterId ?? "");
  // datetime-local formátum: YYYY-MM-DDTHH:mm (helyi idő szerint)
  const [scheduledAt, setScheduledAt] = useState(
    article?.publishedAt ? toLocalInput(new Date(article.publishedAt)) : "",
  );

  const [seo, setSeo] = useState<SeoFields>({
    seoTitle:        article?.seoTitle ?? "",
    metaDescription: article?.metaDescription ?? "",
    focusKeyword:    article?.focusKeyword ?? "",
    keywords:        article?.keywords ?? [],
    tags:            article?.tags ?? [],
  });
  const [shelters, setShelters]   = useState<ShelterOption[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState<"draft" | "publish" | "schedule" | "save" | "delete" | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const isEdit  = Boolean(article);
  const busy    = saving !== null || uploading;

  useEffect(() => {
    fetch("/api/shelters/list")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setShelters(data); })
      .catch(() => {});
  }, []);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const blob = await upload(`article-${Date.now()}.${ext}`, file, {
        access:          "public",
        handleUploadUrl: "/api/upload",
      });
      setImageUrl(blob.url);
    } catch {
      setError("A borítókép feltöltése nem sikerült.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  function validate(): string | null {
    if (title.trim().length < 3) return "A cím legalább 3 karakter legyen.";
    if (title.trim().length > 200) return "A cím legfeljebb 200 karakter lehet.";
    if (excerpt.trim().length > EXCERPT_MAX) return `A bevezető legfeljebb ${EXCERPT_MAX} karakter lehet.`;
    if (!content.trim()) return "A cikk tartalma nem lehet üres.";
    return null;
  }

  /**
   * Mentés. A `publish` értéke dönt a státuszról:
   * true = publikálás, false = piszkozat, undefined = a jelenlegi állapot marad.
   */
  async function save(
    publish: boolean | undefined,
    mode: "draft" | "publish" | "schedule" | "save",
  ) {
    const problem = validate();
    if (problem) { setError(problem); return; }

    setSaving(mode);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title:     title.trim(),
        excerpt:   excerpt.trim() ? excerpt.trim() : isEdit ? null : "",
        content:   content,
        imageUrl:  imageUrl || (isEdit ? null : undefined),
        shelterId: shelterId || null,
        seoTitle:        seo.seoTitle.trim() || null,
        metaDescription: seo.metaDescription.trim() || null,
        focusKeyword:    seo.focusKeyword.trim() || null,
        keywords:        seo.keywords,
        tags:            seo.tags,
      };
      if (publish !== undefined) body.publish = publish;

      // A megjelenés időpontját mindig explicit küldjük, mert a szerveren a
      // `null` azt jelenti: "vissza piszkozatba". Publikálásnál ezért a jelen
      // időt adjuk meg — így egy időzített cikk is azonnal élővé válik.
      if (mode === "schedule") {
        body.publish = true;
        body.publishedAt = new Date(scheduledAt).toISOString();
      } else if (mode === "publish") {
        body.publish = true;
        body.publishedAt = new Date().toISOString();
      }

      const res = await fetch(isEdit ? `/api/posts/${article!.id}` : "/api/posts", {
        method:  isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "A mentés nem sikerült.");
        return;
      }

      if (isEdit) {
        toast.success(
          mode === "schedule" ? "A cikk időzítve." :
          publish === true    ? "A cikk publikálva." :
          publish === false   ? "A cikk visszakerült piszkozatba." :
                                "A cikk mentve.",
        );
        router.refresh();
      } else {
        toast.success(
          mode === "schedule" ? "A cikk időzítve." :
          publish === false   ? "Piszkozat mentve." : "A cikk publikálva.",
        );
        setTitle(""); setExcerpt(""); setContent(""); setImageUrl(""); setShelterId(""); setScheduledAt("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    } catch {
      setError("Hálózati hiba, próbáld újra.");
    } finally {
      setSaving(null);
    }
  }

  async function remove() {
    if (!article) return;
    if (!confirm(`Biztosan törlöd ezt a cikket? ${article.title}`)) return;
    setSaving("delete");
    setError(null);
    try {
      const res = await fetch(`/api/posts/${article.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "A törlés nem sikerült.");
        return;
      }
      toast.success("A cikk törölve.");
      router.push("/dashboard/posts");
      router.refresh();
    } catch {
      setError("Hálózati hiba, próbáld újra.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilePlus2 className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-bold text-gray-900">
            {isEdit ? "Cikk szerkesztése" : "Új cikk"}
          </h2>
          {isEdit && (
            <span
              className={
                article!.published
                  ? "rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700"
                  : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"
              }
            >
              {article!.published ? "Publikálva" : "Piszkozat"}
            </span>
          )}
        </div>
        {isEdit && (
          <Link
            href="/dashboard/posts"
            className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Új cikk írása
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {/* Cím */}
        <div>
          <label htmlFor="article-title" className="mb-1 block text-xs font-semibold text-gray-600">
            Cím *
          </label>
          <input
            id="article-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="pl. Hogyan készülj fel az első kutyádra"
            className={cls}
          />
        </div>

        {/* Rövid bevezető */}
        <div>
          <label htmlFor="article-excerpt" className="mb-1 block text-xs font-semibold text-gray-600">
            Rövid bevezető
          </label>
          <textarea
            id="article-excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            maxLength={EXCERPT_MAX}
            placeholder="Néhány mondat, ami a listákban és a megosztásokban jelenik meg."
            className={`${cls} resize-y`}
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">
            {excerpt.length}/{EXCERPT_MAX}
          </p>
        </div>

        {/* Tartalom */}
        <div>
          <label htmlFor="article-content" className="mb-1 block text-xs font-semibold text-gray-600">
            Tartalom *
          </label>
          <textarea
            id="article-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            placeholder="Írd meg a cikk teljes szövegét. Az üres sorral elválasztott részekből lesznek a bekezdések."
            className={`${cls} resize-y leading-relaxed`}
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">
            {content.trim() ? content.trim().split(/\s+/).length : 0} szó
          </p>
        </div>

        {/* Borítókép */}
        <div>
          <span className="mb-1 block text-xs font-semibold text-gray-600">Borítókép</span>
          {imageUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{imageUrl}</span>
              <button
                type="button"
                onClick={() => {
                  setImageUrl("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3 w-3" /> Eltávolítás
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {uploading ? "Feltöltés folyamatban…" : "Kép kiválasztása (JPG, PNG, WebP – legfeljebb 5 MB)"}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImage}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Kapcsolódó menhely */}
        <div>
          <label htmlFor="article-shelter" className="mb-1 block text-xs font-semibold text-gray-600">
            Kapcsolódó menhely
          </label>
          <select
            id="article-shelter"
            value={shelterId}
            onChange={(e) => setShelterId(e.target.value)}
            className={cls}
          >
            <option value="">Nincs megadva</option>
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            Csak akkor válassz menhelyet, ha a cikk kifejezetten róla szól.
          </p>
        </div>

        <ArticleSeoPanel
          value={seo}
          onChange={setSeo}
          title={title}
          excerpt={excerpt}
          content={content}
          imageUrl={imageUrl}
          slug={article?.slug ?? null}
        />

        {/* Időzítés */}
        <div>
          <label htmlFor="article-schedule" className="mb-1 block text-xs font-semibold text-gray-600">
            Megjelenés időpontja
          </label>
          <input
            id="article-schedule"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={cls}
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Hagyd üresen az azonnali publikáláshoz. Jövőbeli időpontnál a cikk csak
            akkor jelenik meg a látogatóknak — addig itt marad, „Időzítve" jelöléssel.
          </p>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {/* Műveletek */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-4">
          {isEdit ? (
            <>
              <button
                type="button"
                onClick={() => save(undefined, "save")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {saving === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Mentés
              </button>

              {article!.published ? (
                <button
                  type="button"
                  onClick={() => save(false, "draft")}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                  Visszavonás piszkozatba
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => save(true, "publish")}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  {saving === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publikálás
                </button>
              )}

              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => save(true, "schedule")}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
                >
                  {saving === "schedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                  Időzítés
                </button>
              )}

              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="ml-auto flex items-center gap-1.5 rounded-xl border border-red-100 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                {saving === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Törlés
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => save(false, "draft")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Mentés piszkozatként
              </button>
              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => save(true, "schedule")}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
                >
                  {saving === "schedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                  Időzítés
                </button>
              )}
              <button
                type="button"
                onClick={() => save(true, "publish")}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
              >
                {saving === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publikálás
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
