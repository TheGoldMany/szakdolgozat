"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedingScheduleList } from "./feeding-schedule-list";
import { FeedingScheduleForm } from "./feeding-schedule-form";

export type FeedingFrequency = "ONCE_DAILY" | "TWICE_DAILY" | "THREE_DAILY" | "WEEKLY";

export interface FeedingLog {
  id: string;
  scheduleName: string;
  itemName: string;
  unit: string;
  quantity: number;
  executedAt: string;
  skipped: boolean;
  skipReason: string | null;
}

export interface FeedingSchedule {
  id: string;
  name: string;
  inventoryItemId: string;
  inventoryItem: { name: string; unit: string; quantity: number };
  quantityPerFeeding: number;
  frequency: FeedingFrequency;
  times: string[];
  weekDays: number[];
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  note: string | null;
  logs: FeedingLog[];
}

export interface InventoryItemOption {
  id: string;
  name: string;
  unit: string;
  quantity: number;
}

interface Props {
  initialSchedules: FeedingSchedule[];
  inventoryItems: InventoryItemOption[];
  shelterId: string;
}

export function FeedingScheduleManager({ initialSchedules, inventoryItems, shelterId }: Props) {
  const [schedules, setSchedules] = useState<FeedingSchedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<FeedingSchedule | null>(null);

  function handleOpenCreate() {
    setEditTarget(null);
    setShowForm(true);
  }

  function handleOpenEdit(schedule: FeedingSchedule) {
    setEditTarget(schedule);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditTarget(null);
  }

  function handleSaved(updated: FeedingSchedule) {
    setSchedules((prev) => {
      const idx = prev.findIndex((s) => s.id === updated.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    handleClose();
  }

  function handleDeleted(id: string) {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  function handleToggled(updated: FeedingSchedule) {
    setSchedules((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Etetési rend</h1>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4" />
          Új ütemterv
        </Button>
      </div>

      {/* List */}
      <FeedingScheduleList
        schedules={schedules}
        onEdit={handleOpenEdit}
        onDeleted={handleDeleted}
        onToggled={handleToggled}
      />

      {/* Slide-over form */}
      {showForm && (
        <FeedingScheduleForm
          shelterId={shelterId}
          inventoryItems={inventoryItems}
          schedule={editTarget}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
