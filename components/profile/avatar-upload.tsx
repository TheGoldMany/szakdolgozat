"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { Camera, Loader2 } from "lucide-react";

interface Props {
  currentImage: string | null;
  name:         string | null;
}

export function AvatarUpload({ currentImage, name }: Props) {
  const { update } = useSession();
  const [preview,    setPreview]    = useState<string | null>(currentImage);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    setPreview(URL.createObjectURL(file));
    setError("");
    setUploading(true);

    try {
      const ext        = file.name.split(".").pop() ?? "jpg";
      const uniqueName = `avatar-${Date.now()}.${ext}`;

      const blob = await upload(uniqueName, file, {
        access:          "public",
        handleUploadUrl: "/api/upload/avatar",
      });

      // Save to DB
      const res = await fetch("/api/profile/avatar", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: blob.url }),
      });

      if (!res.ok) throw new Error("Mentés sikertelen");

      // Refresh the NextAuth session so the header avatar updates immediately
      await update({ image: blob.url });
    } catch {
      setError("Feltöltés sikertelen, próbáld újra.");
      setPreview(currentImage);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const initial = (name ?? "?")[0].toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <label className="group relative cursor-pointer">
        {/* Avatar circle */}
        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md bg-brand-100">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-brand-600">
              {initial}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading
            ? <Loader2 className="h-6 w-6 animate-spin text-white" />
            : <Camera className="h-6 w-6 text-white" />
          }
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={uploading}
          onChange={handleFile}
        />
      </label>

      <p className="text-xs text-gray-400">
        {uploading ? "Feltöltés..." : "Kattints a kép módosításához"}
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
