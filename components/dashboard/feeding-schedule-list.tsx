"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, Pause, Play, CheckCircle2, AlertTriangle, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedingSchedule, FeedingLog, FeedingFrequency } from "./feeding-schedule-manager";

const WEEKDAY_LABELS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];

function formatFrequency(frequency: FeedingFrequency, weekDays: number[]): string {
  switch (frequency) {
    case "ONCE_DAILY":  return "Naponta 1×";
    case "TWICE_DAILY": return "Naponta 2×";
    case "THREE_DAILY": return "Naponta 3×";
    case "WEEKLY": {
      if (weekDays.length === 0) return "Heti rendszerességgel";
      const days = weekDays.map((d) => WEEKDAY_LABELS[d] ?? d).join(", ");
      return `Heti: ${days}`;
    }
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  schedules: FeedingSchedule[];
  onEdit: (schedule: FeedingSchedule) => void;
  onDeleted: (id: string) => void;
  onToggled: (updated: FeedingSchedule) => void;
}

export function FeedingScheduleList({ schedules, onEdit, onDeleted, onToggled }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleToggleActive(schedule: FeedingSchedule) {
    setTogglingId(schedule.id);
    setError(null);
    try {
      const res = await fetch(`/api/feeding-schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !schedule.isActive }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Hiba történt");
      const updated: FeedingSchedule = await res.json();
      onToggled(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(schedule: FeedingSchedule) {
    if (!confirm(`Biztosan törlöd az „${schedule.name}" ütemtervet? A naplók is törlődnek.`)) return;
    setDeletingId(schedule.id);
    setError(null);
    try {
      const res = await fetch(`/api/feeding-schedules/${schedule.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Törlés sikertelen");
      onDeleted(schedule.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Törlés sikertelen");
    } finally {
      setDeletingId(null);
    }
  }

  if (schedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
        <UtensilsCrossed className="h-10 w-10 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">Még nincs etetési ütemterv.</p>
        <p className="mt-1 text-xs text-gray-400">Kattints az „Új ütemterv" gombra az első létrehozásához.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {schedules.map((schedule) => {
        const isExpanded = expandedId === schedule.id;

        return (
          <div
            key={schedule.id}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            {/* Main card row */}
            <div className="flex items-start gap-4 p-4">
              {/* Left: title + badge */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{schedule.name}</span>
                  {schedule.isActive ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Aktív
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      Szüneteltetett
                    </span>
                  )}
                </div>

                {/* Middle: inventory + frequency info */}
                <p className="text-sm text-gray-600">
                  Készlet:{" "}
                  <span className="font-medium text-gray-800">{schedule.inventoryItem.name}</span>
                  {" · "}
                  <span className="font-medium text-gray-800">
                    {schedule.quantityPerFeeding} {schedule.inventoryItem.unit}
                  </span>
                  {" / etetés"}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {formatFrequency(schedule.frequency, schedule.weekDays)}
                  {schedule.times.length > 0 && (
                    <span className="ml-1 text-gray-400">— {schedule.times.join(", ")}</span>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
                  {schedule.isActive ? (
                    <span>
                      Következő futás:{" "}
                      <span className="text-gray-600">{formatDateTime(schedule.nextRunAt)}</span>
                    </span>
                  ) : (
                    <span className="text-amber-500 font-medium">Szüneteltetve</span>
                  )}
                  {schedule.lastRunAt ? (
                    <span>
                      Utolsó futás:{" "}
                      <span className="text-gray-600">{formatDateTime(schedule.lastRunAt)}</span>
                    </span>
                  ) : (
                    <span>Még nem futott</span>
                  )}
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleActive(schedule)}
                  disabled={togglingId === schedule.id}
                  title={schedule.isActive ? "Szüneteltetés" : "Aktiválás"}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                    schedule.isActive
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  )}
                >
                  {schedule.isActive ? (
                    <><Pause className="h-3.5 w-3.5" /> Szüneteltetés</>
                  ) : (
                    <><Play className="h-3.5 w-3.5" /> Aktiválás</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onEdit(schedule)}
                  title="Szerkesztés"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(schedule)}
                  disabled={deletingId === schedule.id}
                  title="Törlés"
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleExpand(schedule.id)}
                  title={isExpanded ? "Összecsukás" : "Napló megtekintése"}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Expandable logs section */}
            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Utolsó etetések
                </p>
                {schedule.logs.length === 0 ? (
                  <p className="text-xs text-gray-400">Még nincs napló ehhez az ütemtervhez.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="pb-1.5 pr-4 text-left font-medium">Dátum</th>
                          <th className="pb-1.5 pr-4 text-right font-medium">Mennyiség</th>
                          <th className="pb-1.5 text-left font-medium">Státusz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {schedule.logs.map((log) => (
                          <FeedingLogRow key={log.id} log={log} unit={schedule.inventoryItem.unit} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeedingLogRow({ log, unit }: { log: FeedingLog; unit: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-4 text-gray-600">
        {new Date(log.executedAt).toLocaleString("hu-HU", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="py-1.5 pr-4 text-right text-gray-700 font-medium">
        {log.quantity} {unit}
      </td>
      <td className="py-1.5">
        {log.skipped ? (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Kihagyva
            {log.skipReason && (
              <span className="ml-1 text-gray-400">({log.skipReason})</span>
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Sikeres
          </span>
        )}
      </td>
    </tr>
  );
}
