"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { ImageIcon, X, Loader2, Upload } from "lucide-react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Fotó" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Csak képfájl tölthető fel (JPG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A kép mérete maximum 5 MB lehet.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      onChange(blob.url);
    } catch {
      setError("Feltöltés sikertelen. Próbáld újra.");
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
  }

  function handleRemove() {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>

      {value ? (
        /* Előnézet */
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Előnézet"
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
              <p className="text-sm text-gray-500">Feltöltés folyamatban...</p>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  <span className="text-brand-500">Kattints a feltöltéshez</span>
                  {" "}vagy húzd ide a képet
                </p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP – max. 5 MB</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-600">
                <Upload className="h-3.5 w-3.5" />
                Kép kiválasztása
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleChange}
      />

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
