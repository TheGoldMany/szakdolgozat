"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, Trash2, Upload, Save, Camera, Loader2, PawPrint, Building2, CheckCircle, AlertTriangle, Info } from "lucide-react";

interface ShelterDoc {
  id:        string;
  name:      string;
  url:       string;
  fileType:  string;
  createdAt: Date | string;
}

interface Props {
  shelter: {
    id:                      string;
    name:                    string;
    logoUrl:                 string | null;
    adoptionRequirements:    string | null;
    documents:               ShelterDoc[];
    companyName:             string | null;
    taxNumber:               string | null;
    bankAccountName:         string | null;
    bankAccountNumber:       string | null;
    stripeAccountId:         string | null;
    stripeOnboardingComplete: boolean;
  };
}

const cls = "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

export function ShelterSettingsForm({ shelter }: Props) {
  // --- Logo ---
  const [logoPreview,   setLogoPreview]   = useState<string | null>(shelter.logoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError,     setLogoError]     = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  // --- Payment info ---
  const [companyName,       setCompanyName]       = useState(shelter.companyName       ?? "");
  const [taxNumber,         setTaxNumber]         = useState(shelter.taxNumber         ?? "");
  const [bankAccountName,   setBankAccountName]   = useState(shelter.bankAccountName   ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(shelter.bankAccountNumber ?? "");
  const [paySaving,  setPaySaving]  = useState(false);
  const [paySaved,   setPaySaved]   = useState(false);
  const [payError,   setPayError]   = useState("");

  // --- Requirements ---
  const [requirements, setRequirements] = useState(shelter.adoptionRequirements ?? "");
  const [reqSaving,    setReqSaving]    = useState(false);
  const [reqSaved,     setReqSaved]     = useState(false);

  // --- Stripe Connect ---
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError,   setStripeError]   = useState("");

  async function handleStripeConnect() {
    setStripeLoading(true);
    setStripeError("");
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "shelter", shelterId: shelter.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hiba történt");
      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ismeretlen hiba";
      setStripeError(message);
      setStripeLoading(false);
    }
  }

  // --- Documents ---
  const [docs,        setDocs]        = useState<ShelterDoc[]>(shelter.documents);
  const [docName,     setDocName]     = useState("");
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
    setLogoError("");
    setLogoUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const blob = await upload(`logo-${Date.now()}.${ext}`, file, {
        access:          "public",
        handleUploadUrl: "/api/upload/avatar",
      });
      const res = await fetch(`/api/shelters/${shelter.id}/logo`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ logoUrl: blob.url }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLogoError("Feltöltés sikertelen.");
      setLogoPreview(shelter.logoUrl);
    } finally {
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  async function savePaymentInfo() {
    setPaySaving(true);
    setPaySaved(false);
    setPayError("");
    try {
      const res = await fetch(`/api/shelters/${shelter.id}/payment-info`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ companyName, taxNumber, bankAccountName, bankAccountNumber }),
      });
      if (!res.ok) throw new Error();
      setPaySaved(true);
      setTimeout(() => setPaySaved(false), 3000);
    } catch {
      setPayError("Mentés sikertelen.");
    } finally {
      setPaySaving(false);
    }
  }

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

      {/* Stripe Connect */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Stripe Connect</h2>
        <p className="mb-4 text-xs text-gray-400">
          Csatlakoztasd Stripe fiókodat, hogy az adományok és előfizetési díjak automatikusan a számládra érkezzenek (1% platform díj levonásával).
        </p>

        {shelter.stripeOnboardingComplete ? (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Stripe fiók aktív – az adományok automatikusan érkeznek a számládra.
            </p>
          </div>
        ) : shelter.stripeAccountId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">
                Az onboarding nem teljes. Kattints a gombra a folytatáshoz.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStripeConnect}
              disabled={stripeLoading}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {stripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Info className="h-4 w-4" />}
              {stripeLoading ? "Átirányítás..." : "Stripe fiók csatlakoztatása"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-800">
                Csatlakoztasd Stripe fiókodat, hogy az adományok és előfizetési díjak automatikusan a számládra érkezzenek (1% platform díj levonásával).
              </p>
            </div>
            <button
              type="button"
              onClick={handleStripeConnect}
              disabled={stripeLoading}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {stripeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {stripeLoading ? "Átirányítás..." : "Stripe fiók csatlakoztatása"}
            </button>
          </div>
        )}

        {stripeError && <p className="mt-2 text-xs text-red-500">{stripeError}</p>}
      </div>

      {/* Menhely logó */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Menhely profilkép</h2>
        <p className="mb-5 text-xs text-gray-400">
          Ez az ikon jelenik meg a menhelyek listáján és az állatok oldalán.
        </p>
        <div className="flex items-center gap-5">
          <label className="group relative cursor-pointer shrink-0">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-brand-100 shadow-md">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logó" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <PawPrint className="h-10 w-10 text-brand-400" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {logoUploading
                ? <Loader2 className="h-6 w-6 animate-spin text-white" />
                : <Camera className="h-6 w-6 text-white" />
              }
            </div>
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only" disabled={logoUploading} onChange={handleLogoChange} />
          </label>
          <div>
            <p className="text-sm font-medium text-gray-700">{shelter.name}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {logoUploading ? "Feltöltés..." : "Kattints a képre a módosításhoz"}
            </p>
            {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
          </div>
        </div>
      </div>

      {/* Fizetési adatok */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Fizetési adatok</h2>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Ezek az adatok jelennek meg az adományozóknál, amikor előfizetnek a csomagjaidra.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Cégnév / Szervezet neve</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              placeholder="pl. Kis Gömböc Menhely Alapítvány" className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Adószám</label>
            <input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="pl. 12345678-1-01" className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Bankszámla tulajdonosa</label>
            <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)}
              placeholder="pl. Kis Gömböc Menhely Alapítvány" className={cls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Bankszámlaszám</label>
            <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="pl. 12345678-12345678-12345678" className={cls} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={savePaymentInfo} disabled={paySaving}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
            <Save className="h-4 w-4" />
            {paySaving ? "Mentés..." : "Mentés"}
          </button>
          {paySaved && <span className="text-sm text-brand-600">Elmentve!</span>}
          {payError && <span className="text-sm text-red-500">{payError}</span>}
        </div>
      </div>

      {/* Örökbefogadási feltételek */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Örökbefogadási feltételek</h2>
        <p className="mb-4 text-xs text-gray-400">
          Ez a szöveg megjelenik minden általad feltöltött állat oldalán.
        </p>
        <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)}
          rows={8} placeholder="Pl. Az örökbefogadó legyen 18 éves..."
          className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y" />
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={saveRequirements} disabled={reqSaving}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
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

        {docs.length > 0 && (
          <ul className="mb-4 space-y-2">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="truncate text-sm font-medium text-gray-700 hover:text-brand-600 hover:underline">
                    {doc.name}
                  </a>
                </div>
                <button type="button" onClick={() => deleteDoc(doc.id)}
                  className="shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 rounded-xl border border-dashed border-gray-300 p-4">
          <p className="text-xs font-medium text-gray-500">Új dokumentum feltöltése</p>
          <input type="text" placeholder="Dokumentum neve (pl. Örökbefogadási nyilatkozat)"
            value={docName} onChange={(e) => setDocName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? "Feltöltés..." : "Fájl kiválasztása"}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="sr-only"
                disabled={uploading} onChange={handleDocUpload} />
            </label>
            <span className="text-xs text-gray-400">PDF, DOC, DOCX · Max 10 MB</span>
          </div>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        </div>
      </div>

    </div>
  );
}
