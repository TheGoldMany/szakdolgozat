"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { ImageIcon, X, Loader2, Upload, Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { prepareImage } from "@/lib/prepare-image";
import { useCameraCapture } from "@/components/ui/use-camera-capture";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const t = useTranslations("common");
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  // A kamera külön mezőt használ (`capture`), súgóval arra az esetre, ha a
  // telefon nem engedi a kamerát (lásd use-camera-capture).
  const camera = useCameraCapture(
    (files) => { if (files[0]) handleFile(files[0]); },
    () => inputRef.current?.click(),
  );

  const displayLabel = label ?? t("photo");

  async function handleFile(original: File) {
    if (!original.type.startsWith("image/") && !/\.(heic|heif)$/i.test(original.name)) {
      setError(t("uploadOnlyImages"));
      return;
    }
    setError(null);
    setUploading(true);
    // A telefonos fotó gyakran 5 MB fölötti: feltöltés előtt kicsinyítjük.
    const file = await prepareImage(original);
    if (file.size > 5 * 1024 * 1024) {
      setUploading(false);
      setError(t("uploadMaxSize"));
      return;
    }

    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const blob = await upload(uniqueName, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      onChange(blob.url);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Ugyanaz a kép újra kiválasztható legyen (különben nincs change esemény).
    e.target.value = "";
  }

  function handleRemove() {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{displayLabel}</label>

      {value ? (
        /* Előnézet */
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={t("imagePreview")}
            className="h-48 w-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow-sm hover:bg-white transition-colors"
          >
            <X className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      ) : (
        /* Drop zóna */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              <p className="text-sm text-gray-500">{t("uploading")}</p>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  <span className="text-brand-500">{t("uploadClickToUpload")}</span>
                  {" "}{t("uploadOrDrag")}
                </p>
                <p className="mt-1 text-xs text-gray-400">{t("uploadFormats")}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700">
                  <Upload className="h-3.5 w-3.5" />
                  {t("uploadSelectImage")}
                </span>
                {/* Csak érintőképernyőn: asztali gépen a capture-t a böngésző
                    figyelmen kívül hagyná, és ugyanaz a fájlválasztó nyílna. */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void camera.open(); }}
                  className="hidden items-center gap-2 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white [@media(pointer:coarse)]:flex"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {t("takePhoto")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      {camera.input}
      {camera.helpPanel}

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
