"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface FormField {
  id:       string;
  label:    string;
  type:     "TEXT" | "TEXTAREA" | "IMAGE" | "FILE";
  required: boolean;
  order:    number;
}

interface ApplicationFormFillerProps {
  token:       string;
  fields:      FormField[];
  animalSlug:  string;
}

export function ApplicationFormFiller({ token, fields, animalSlug }: ApplicationFormFillerProps) {
  const [values, setValues]       = useState<Record<string, string>>({});
  const [fileUrls, setFileUrls]   = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [submitted, setSubmitted]   = useState(false);

  function setValue(fieldId: string, val: string) {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
  }

  async function handleFileChange(fieldId: string, file: File, isImage: boolean) {
    setUploadErrors((prev) => ({ ...prev, [fieldId]: "" }));
    setUploading((prev) => ({ ...prev, [fieldId]: true }));
    try {
      const ext        = file.name.split(".").pop() ?? "bin";
      const uniqueName = `apply-${token}-${fieldId}-${Date.now()}.${ext}`;
      const blob       = await upload(uniqueName, file, {
        access:          "public",
        handleUploadUrl: "/api/upload",
      });
      setFileUrls((prev) => ({ ...prev, [fieldId]: blob.url }));
    } catch {
      setUploadErrors((prev) => ({ ...prev, [fieldId]: "Feltöltés sikertelen, próbáld újra." }));
    } finally {
      setUploading((prev) => ({ ...prev, [fieldId]: false }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side required validation
    for (const field of fields) {
      if (field.required) {
        const hasText = values[field.id]?.trim();
        const hasFile = fileUrls[field.id];
        if (!hasText && !hasFile) {
          setError(`A "${field.label}" mező kitöltése kötelező.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const responses = fields.map((f) => ({
        fieldId: f.id,
        value:   values[f.id] ?? undefined,
        fileUrl: fileUrls[f.id] ?? undefined,
      }));

      const res = await fetch(`/api/apply/${token}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ responses }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Beküldés sikertelen");
      }
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h2 className="text-xl font-bold text-green-800 mb-2">Kérvény sikeresen beküldve!</h2>
        <p className="text-sm text-green-700 mb-6">
          A menhely hamarosan felveszi veled a kapcsolatot.
        </p>
        <a
          href={`/animals/${animalSlug}`}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          Vissza az állat profiljához
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {fields.map((field) => (
        <div key={field.id}>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </label>

          {field.type === "TEXT" && (
            <input
              type="text"
              value={values[field.id] ?? ""}
              onChange={(e) => setValue(field.id, e.target.value)}
              required={field.required}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}

          {field.type === "TEXTAREA" && (
            <textarea
              value={values[field.id] ?? ""}
              onChange={(e) => setValue(field.id, e.target.value)}
              required={field.required}
              rows={4}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          )}

          {(field.type === "IMAGE" || field.type === "FILE") && (
            <div>
              <input
                type="file"
                accept={field.type === "IMAGE" ? "image/*" : undefined}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(field.id, file, field.type === "IMAGE");
                }}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              {uploading[field.id] && (
                <p className="mt-1 text-xs text-gray-500">Feltöltés folyamatban...</p>
              )}
              {uploadErrors[field.id] && (
                <p className="mt-1 text-xs text-red-600">{uploadErrors[field.id]}</p>
              )}
              {fileUrls[field.id] && !uploading[field.id] && (
                <p className="mt-1 text-xs text-green-600">Fájl feltöltve.</p>
              )}
            </div>
          )}
        </div>
      ))}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || Object.values(uploading).some(Boolean)}
        className={cn(
          "w-full rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm",
          (submitting || Object.values(uploading).some(Boolean)) && "opacity-50 cursor-not-allowed"
        )}
      >
        {submitting ? "Beküldés..." : "Kérvény beküldése"}
      </button>
    </form>
  );
}
