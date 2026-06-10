"use client";

import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeedingSchedule, FeedingFrequency, InventoryItemOption } from "./feeding-schedule-manager";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formSchema = z
  .object({
    name: z.string().min(2, "A név legalább 2 karakter legyen"),
    inventoryItemId: z.string().min(1, "Válassz készletcikket"),
    quantityPerFeeding: z
      .number({ invalid_type_error: "Adj meg mennyiséget" })
      .positive("A mennyiségnek pozitívnak kell lennie"),
    frequency: z.enum(["ONCE_DAILY", "TWICE_DAILY", "THREE_DAILY", "WEEKLY"]),
    times: z
      .array(z.string().regex(timeRegex, "Érvénytelen időpont (HH:MM)"))
      .min(1, "Legalább egy időpontot adj meg"),
    weekDays: z.array(z.number()),
    note: z.string().optional(),
  })
  .refine(
    (data) => data.frequency !== "WEEKLY" || data.weekDays.length > 0,
    { message: "Heti ütemtervhez legalább egy napot jelölj be", path: ["weekDays"] }
  );

type FormErrors = Partial<Record<keyof z.infer<typeof formSchema> | "weekDays" | "root", string>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FREQUENCY_OPTIONS: { value: FeedingFrequency; label: string; timeCount: number }[] = [
  { value: "ONCE_DAILY",  label: "Naponta 1×",           timeCount: 1 },
  { value: "TWICE_DAILY", label: "Naponta 2×",           timeCount: 2 },
  { value: "THREE_DAILY", label: "Naponta 3×",           timeCount: 3 },
  { value: "WEEKLY",      label: "Heti rendszerességgel", timeCount: 1 },
];

const WEEKDAY_LABELS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

function defaultTimes(freq: FeedingFrequency): string[] {
  switch (freq) {
    case "ONCE_DAILY":  return ["08:00"];
    case "TWICE_DAILY": return ["08:00", "18:00"];
    case "THREE_DAILY": return ["07:00", "13:00", "19:00"];
    case "WEEKLY":      return ["08:00"];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  shelterId: string;
  inventoryItems: InventoryItemOption[];
  schedule: FeedingSchedule | null; // null = create mode
  onClose: () => void;
  onSaved: (schedule: FeedingSchedule) => void;
}

export function FeedingScheduleForm({ shelterId, inventoryItems, schedule, onClose, onSaved }: Props) {
  const isEdit = !!schedule;

  // Form state
  const [name,              setName]              = useState(schedule?.name ?? "");
  const [inventoryItemId,   setInventoryItemId]   = useState(schedule?.inventoryItemId ?? "");
  const [quantity,          setQuantity]          = useState(schedule ? String(schedule.quantityPerFeeding) : "");
  const [frequency,         setFrequency]         = useState<FeedingFrequency>(schedule?.frequency ?? "ONCE_DAILY");
  const [times,             setTimes]             = useState<string[]>(schedule?.times ?? defaultTimes("ONCE_DAILY"));
  const [weekDays,          setWeekDays]          = useState<number[]>(schedule?.weekDays ?? []);
  const [note,              setNote]              = useState(schedule?.note ?? "");
  const [errors,            setErrors]            = useState<FormErrors>({});
  const [saving,            setSaving]            = useState(false);

  // Adjust times array when frequency changes
  useEffect(() => {
    const opt = FREQUENCY_OPTIONS.find((o) => o.value === frequency)!;
    setTimes((prev) => {
      const next = [...prev];
      while (next.length < opt.timeCount) next.push("08:00");
      return next.slice(0, opt.timeCount);
    });
    if (frequency !== "WEEKLY") setWeekDays([]);
  }, [frequency]);

  function toggleWeekDay(day: number) {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function updateTime(index: number, value: string) {
    setTimes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = formSchema.safeParse({
      name: name.trim(),
      inventoryItemId,
      quantityPerFeeding: parseFloat(quantity),
      frequency,
      times,
      weekDays,
      note: note || undefined,
    });

    if (!parsed.success) {
      const errs: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...parsed.data,
        shelterId: isEdit ? undefined : shelterId,
      };

      const url = isEdit
        ? `/api/feeding-schedules/${schedule.id}`
        : `/api/shelters/${shelterId}/feeding-schedules`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors({ root: data.error ?? "Mentés sikertelen" });
        return;
      }

      const saved: FeedingSchedule = await res.json();
      onSaved(saved);
    } catch {
      setErrors({ root: "Váratlan hiba történt" });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";
  const errCls   = "mt-1 text-xs text-red-500";

  const selectedItem = inventoryItems.find((i) => i.id === inventoryItemId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Ütemterv szerkesztése" : "Új etetési ütemterv"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-5 px-5 py-5">
            {errors.root && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {errors.root}
              </div>
            )}

            {/* 1. Név */}
            <div>
              <label className={labelCls}>Név *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pl. Reggeli etetés – kutyák"
                className={inputCls}
              />
              {errors.name && <p className={errCls}>{errors.name}</p>}
            </div>

            {/* 2. Készletcikk */}
            <div>
              <label className={labelCls}>Készletcikk *</label>
              <select
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
                className={inputCls}
              >
                <option value="">— Válassz cikket —</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.unit})
                  </option>
                ))}
              </select>
              {errors.inventoryItemId && <p className={errCls}>{errors.inventoryItemId}</p>}
            </div>

            {/* 3. Mennyiség / etetés */}
            <div>
              <label className={labelCls}>Mennyiség / etetés *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="pl. 0.5"
                  className={cn(inputCls, "flex-1")}
                />
                {selectedItem && (
                  <span className="shrink-0 rounded-lg bg-gray-100 px-2.5 py-2 text-xs font-medium text-gray-600">
                    {selectedItem.unit}
                  </span>
                )}
              </div>
              {errors.quantityPerFeeding && <p className={errCls}>{errors.quantityPerFeeding}</p>}
            </div>

            {/* 4. Frekvencia */}
            <div>
              <label className={labelCls}>Frekvencia *</label>
              <div className="grid grid-cols-2 gap-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium transition-colors text-left",
                      frequency === opt.value
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4b. Napok – WEEKLY esetén */}
            {frequency === "WEEKLY" && (
              <div>
                <label className={labelCls}>Napok *</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleWeekDay(idx)}
                      className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                        weekDays.includes(idx)
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {errors.weekDays && <p className={errCls}>{errors.weekDays}</p>}
              </div>
            )}

            {/* 5. Időpontok */}
            <div>
              <label className={labelCls}>
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                {times.length === 1 ? "Időpont *" : "Időpontok *"}
              </label>
              <div className="space-y-2">
                {times.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-gray-400">{idx + 1}.</span>
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => updateTime(idx, e.target.value)}
                      className={cn(inputCls, "flex-1")}
                    />
                  </div>
                ))}
              </div>
              {errors.times && <p className={errCls}>{errors.times}</p>}
            </div>

            {/* 6. Megjegyzés */}
            <div>
              <label className={labelCls}>Megjegyzés</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="nem kötelező"
                className={cn(inputCls, "resize-none")}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Mégse
            </Button>
            <Button type="submit" loading={saving}>
              {isEdit ? "Mentés" : "Létrehozás"}
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
