"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { AppointmentForm } from "./appointment-form";

interface Props {
  shelterId:  string;
  animalId:   string;
  animalName: string;
}

export function AppointmentButton({ shelterId, animalId, animalName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <CalendarDays className="h-4 w-4" />
          Időpont kérése
        </button>
      ) : (
        <AppointmentForm
          shelterId={shelterId}
          animalId={animalId}
          animalName={animalName}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
