"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Plus, X, Star } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  value:    string[];
  onChange: (urls: string[]) => void;
  max?:     number;
  label?:   string;
}

export function MultiImageUpload({ value, onChange, max = 6, label }: Props) {
  const t = useTranslations("common");
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);

  const displayLabel = label ?? t("photos");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = max - value.length;
    const toUpload  = Array.from(files).slice(0, remaining);
    setError("");

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (!file.type.startsWith("image/")) { setError(t("uploadOnlyImages")); continue; }
      if (file.size > 5 * 1024 * 1024)     { setError(t("uploadMaxSizePerImage")); continue; }

      setUploading(value.length + i);
      try {
        const ext        = file.name.split(".").pop() ?? "jpg";
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const blob       = await upload(uniqueName, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        onChange([...value, blob.url]);
      } catch {
        setError(t("uploadFailed"));
      } finally {
        setUploading(null);
      }
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function makePrimary(idx: number) {
    if (idx === 0) return;
    const next = [...value];
    [next[0], next[idx]] = [next[idx], next[0]];
    onChange(next);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{displayLabel}</label>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {value.map((url, idx) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <Image src={url} alt={`${t("imageAlt")} ${idx + 1}`} fill className="object-cover" sizes="150px" />

            {idx === 0 && (
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Star className="h-2.5 w-2.5" /> {t("primaryImage")}
              </span>
            )}

            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {idx !== 0 && (
                <button
                  type="button"
                  onClick={() => makePrimary(idx)}
                  title={t("makePrimary")}
                  className="rounded-full bg-white/90 p-1.5 text-gray-700 hover:bg-white"
                >
                  <Star className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="rounded-full bg-white/90 p-1.5 text-red-500 hover:bg-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Upload slot */}
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading !== null}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-500 disabled:opacity-50"
          >
            {uploading !== null ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span className="text-xs">{t("addImage")}</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      <p className="mt-1.5 text-xs text-gray-400">
        {t("multiImageHint", { max })}
      </p>
    </div>
  );
}
