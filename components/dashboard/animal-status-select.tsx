"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimalStatus } from "@prisma/client";

const OPTIONS: { value: AnimalStatus; label: string }[] = [
  { value: "AVAILABLE",    label: "Örökbefogadható" },
  { value: "PENDING",      label: "Folyamatban" },
  { value: "ADOPTED",      label: "Örökbefogadott" },
  { value: "FOSTER",       label: "Ideiglenes" },
  { value: "MEDICAL_HOLD", label: "Kezelés alatt" },
];

export function AnimalStatusSelect({
  animalId,
  currentStatus,
}: {
  animalId: string;
  currentStatus: AnimalStatus;
}) {
  const router  = useRouter();
  const [saving, setSaving] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true);
    await fetch(`/api/dashboard/animals/${animalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.target.value }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={currentStatus}
      onChange={onChange}
      disabled={saving}
      className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
