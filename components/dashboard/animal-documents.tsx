"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, Trash2, Upload, ExternalLink } from "lucide-react";

type Doc = {
  id:        string;
  name:      string;
  url:       string;
  fileType:  string;
  sizeBytes: number | null;
  createdAt: string;
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeLabel(mime: string): string {
  if (mime.includes("pdf"))  return "PDF";
  if (mime.includes("word")) return "Word";
  return mime.split("/")[1]?.toUpperCase() ?? "Fájl";
}

export function AnimalDocuments({
  animalId,
  initialDocs,
}: {
  animalId:    string;
  initialDocs: Doc[];
}) {
  const [docs,       setDocs]       = useState<Doc[]>(initialDocs);
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const ext  = file.name.split(".").pop() ?? "pdf";
      const blob = await upload(`animal-doc-${animalId}-${Date.now()}.${ext}`, file, {
        access:          "public",
        handleUploadUrl: "/api/upload/document",
      });

      const res  = await fetch(`/api/animals/${animalId}/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:      file.name,
          url:       blob.url,
          fileType:  file.type,
          sizeBytes: file.size,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Mentési hiba");
      }

      const doc = await res.json() as Doc;
      setDocs((prev) => [doc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feltöltési hiba");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Biztosan törlöd ezt a dokumentumot?")) return;
    setDeleting(docId);
    setError(null);
    try {
      const res = await fetch(`/api/animals/${animalId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Törlési hiba");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Törlési hiba");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition-colors"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Feltöltés..." : "Dokumentum feltöltése"}
        </button>
        <p className="mt-1.5 text-xs text-gray-400">PDF, DOC, DOCX – max. 10 MB</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Document list */}
      {docs.length === 0 ? (
        <p className="text-sm text-gray-400">Még nincs feltöltött dokumentum.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                  <FileText className="h-5 w-5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {fileTypeLabel(doc.fileType)}
                    {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ""}
                    {" · "}
                    {new Date(doc.createdAt).toLocaleDateString("hu-HU")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 ml-3">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-brand-600 transition-colors"
                  title="Megnyitás"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting === doc.id}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-500 disabled:opacity-50 transition-colors"
                  title="Törlés"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
