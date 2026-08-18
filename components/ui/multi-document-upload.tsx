"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { Plus, X, FileText } from "lucide-react";

export interface DocItem {
  url:       string;
  name:      string;
  fileType:  string;
  sizeBytes: number;
}

interface Props {
  value:    DocItem[];
  onChange: (docs: DocItem[]) => void;
  max?:     number;
  label?:   string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MultiDocumentUpload({ value, onChange, max = 8, label = "Hivatalos papírok" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const inputRef                  = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = max - value.length;
    const toUpload  = Array.from(files).slice(0, remaining);
    setError("");

    const added: DocItem[] = [];
    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) { setError("Egy fájl maximum 10 MB lehet."); continue; }
      setUploading(true);
      try {
        const ext        = file.name.split(".").pop() ?? "pdf";
        const uniqueName = `animal-doc-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const blob       = await upload(uniqueName, file, {
          access:          "public",
          handleUploadUrl: "/api/upload/document",
        });
        added.push({ url: blob.url, name: file.name, fileType: file.type || "application/pdf", sizeBytes: file.size });
      } catch {
        setError("A fájl feltöltése sikertelen volt.");
      } finally {
        setUploading(false);
      }
    }
    if (added.length) onChange([...value, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>

      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((doc, idx) => (
            <li key={doc.url} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="truncate text-sm font-medium text-gray-700">{doc.name}</span>
                <span className="shrink-0 text-xs text-gray-400">{formatSize(doc.sizeBytes)}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-500 disabled:opacity-50"
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {uploading ? "Feltöltés…" : "Dokumentum hozzáadása"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      <p className="mt-1.5 text-xs text-gray-400">
        Pl. oltási könyv, ivartalanítási igazolás, chip-regisztráció. PDF, DOC, DOCX · max. 10 MB / fájl
      </p>
    </div>
  );
}
