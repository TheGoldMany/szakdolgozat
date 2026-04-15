"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, Trash2, Upload, Save } from "lucide-react";

interface ShelterDoc {
  id:        string;
  name:      string;
  url:       string;
  fileType:  string;
  createdAt: Date | string;
}

interface Props {
  shelter: {
    id:                   string;
    name:                 string;
    adoptionRequirements: string | null;
    documents:            ShelterDoc[];
  };
}

export function ShelterSettingsForm({ shelter }: Props) {
  const [requirements, setRequirements] = useState(shelter.adoptionRequirements ?? "");
  const [reqSaving, setReqSaving]       = useState(false);
  const [reqSaved,  setReqSaved]        = useState(false);

  const [docs,        setDocs]        = useState<ShelterDoc[]>(shelter.documents);
  const [docName,     setDocName]     = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveRequirements() {
    setReqSaving(true);
    setReqSaved(false);
    try {
      await fetch(`/api/shelters/${shelter.id}/requirements`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ adoptionRequirements: requirements }),
      });
      setReqSaved(true);
      setTimeout(() => setReqSaved(false), 3000);
    } finally {
      setReqSaving(false);
    }
  }

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !docName.trim()) {
      setUploadError("Add meg a dokumentum nevét először.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const ext        = file.name.split(".").pop() ?? "pdf";
      const uniqueName = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const blob       = await upload(uniqueName, file, {
        access:          "public",
        handleUploadUrl: "/api/upload/document",
      });
      const res = await fetch(`/api/shelters/${shelter.id}/documents`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: docName.trim(), url: blob.url, fileType: file.type }),
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocs((d) => [...d, newDoc]);
        setDocName("");
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setUploadError("Feltöltés sikertelen.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDoc(docId: string) {
    await fetch(`/api/shelters/${shelter.id}/documents/${docId}`, { method: "DELETE" });
    setDocs((d) => d.filter((doc) => doc.id !== docId));
  }

  return (
    <div className="space-y-6">

      {/* Örökbefogadási feltételek */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Örökbefogadási feltételek</h2>
        <p className="mb-4 text-xs text-gray-400">
          Ez a szöveg megjelenik minden általad feltöltött állat oldalán.
        </p>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          rows={8}
          placeholder="Pl. Az örökbefogadó legyen 18 éves. Házi látogatást végzünk. Az örökbefogadási díj 15 000 Ft..."
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={saveRequirements}
            disabled={reqSaving}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            {reqSaving ? "Mentés..." : "Mentés"}
          </button>
          {reqSaved && <span className="text-sm text-brand-600">Elmentve!</span>}
        </div>
      </div>

      {/* Dokumentumok */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Letölthető dokumentumok</h2>
        <p className="mb-4 text-xs text-gray-400">
          Örökbefogadási nyilatkozat, igénylőlap – minden állatod oldalán megjelennek.
        </p>

        {/* Meglévő dokumentumok */}
        {docs.length > 0 && (
          <ul className="mb-4 space-y-2">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-gray-700 hover:text-brand-600 hover:underline"
                  >
                    {doc.name}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDoc(doc.id)}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Új dokumentum feltöltése */}
        <div className="space-y-3 rounded-xl border border-dashed border-gray-300 p-4">
          <p className="text-xs font-medium text-gray-500">Új dokumentum feltöltése</p>
          <input
            type="text"
            placeholder="Dokumentum neve (pl. Örökbefogadási nyilatkozat)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? "Feltöltés..." : "Fájl kiválasztása"}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                disabled={uploading}
                onChange={handleDocUpload}
              />
            </label>
            <span className="text-xs text-gray-400">PDF, DOC, DOCX · Max 10 MB</span>
          </div>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        </div>
      </div>

    </div>
  );
}
