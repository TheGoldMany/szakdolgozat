"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

type FieldType = "TEXT" | "TEXTAREA" | "IMAGE" | "FILE";

interface FormFieldData {
  id?: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
}

interface FormBuilderProps {
  formId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialFields?: FormFieldData[];
  initialStatus?: string;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT:     "Szöveg",
  TEXTAREA: "Bekezdés",
  IMAGE:    "Kép feltöltés",
  FILE:     "Fájl feltöltés",
};

export function FormBuilder({
  formId,
  initialTitle = "",
  initialDescription = "",
  initialFields = [],
  initialStatus = "DRAFT",
}: FormBuilderProps) {
  const router = useRouter();
  const [title, setTitle]             = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [fields, setFields]           = useState<FormFieldData[]>(initialFields);
  const [saving, setSaving]           = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  const isDraft = !initialStatus || initialStatus === "DRAFT";

  function addField() {
    setFields((prev) => [
      ...prev,
      { label: "", type: "TEXT", required: false, order: prev.length },
    ]);
  }

  function removeField(index: number) {
    setFields((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }

  function updateField(index: number, patch: Partial<FormFieldData>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  }

  function moveField(index: number, direction: "up" | "down") {
    setFields((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }

  async function saveForm(): Promise<string | null> {
    if (!title.trim()) {
      setError("A sablon neve kötelező.");
      return null;
    }

    const payload = {
      title:       title.trim(),
      description: description.trim() || undefined,
      fields:      fields.map((f, i) => ({
        label:    f.label,
        type:     f.type,
        required: f.required,
        order:    i,
      })),
    };

    if (formId) {
      const res = await fetch(`/api/application-forms/${formId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Mentés sikertelen");
      }
      return formId;
    } else {
      const res = await fetch("/api/application-forms", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Létrehozás sikertelen");
      }
      const data = await res.json();
      return data.id as string;
    }
  }

  async function handleSaveDraft() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const id = await saveForm();
      if (!id) return;
      setSuccess("Piszkozat mentve.");
      if (!formId) {
        router.push(`/dashboard/forms/${id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForApproval() {
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const id = await saveForm();
      if (!id) return;

      const res = await fetch(`/api/application-forms/${id}/request-approval`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Beküldés sikertelen");
      }
      setSuccess("Sablon beküldve jóváhagyásra.");
      router.push("/dashboard/forms");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Description */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Sablon adatai</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sablon neve <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="pl. Örökbefogadási kérvény 2024"
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={!isDraft}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Leírás</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcionális leírás a kérvénysablonhoz..."
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={!isDraft}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Mezők</h2>
          {isDraft && (
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Mező hozzáadása
            </button>
          )}
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            Még nincs mező. Adj hozzá egyet!
          </p>
        )}

        {fields.length > 0 && isDraft && (
          <p className="text-xs text-gray-400">
            Átírhatod a feliratokat, törölhetsz vagy átrendezhetsz mezőket, és újakat is hozzáadhatsz.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => moveField(i, "up")}
                  disabled={i === 0 || !isDraft}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveField(i, "down")}
                  disabled={i === fields.length - 1 || !isDraft}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Felirat</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Mező felirata"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    disabled={!isDraft}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Típus</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    disabled={!isDraft}
                  >
                    {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      disabled={!isDraft}
                    />
                    Kötelező
                  </label>
                </div>
              </div>

              {isDraft && (
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="mt-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Actions */}
      {isDraft && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || submitting}
            className={cn(
              "rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors",
              (saving || submitting) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? "Mentés..." : "Mentés piszkozatként"}
          </button>
          <button
            type="button"
            onClick={handleSubmitForApproval}
            disabled={saving || submitting}
            className={cn(
              "rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-sm",
              (saving || submitting) && "opacity-50 cursor-not-allowed"
            )}
          >
            {submitting ? "Beküldés..." : "Beküldés jóváhagyásra"}
          </button>
        </div>
      )}

      {!isDraft && (
        <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          Ez a sablon már nem piszkozat állapotban van, ezért nem szerkeszthető.
        </div>
      )}
    </div>
  );
}
