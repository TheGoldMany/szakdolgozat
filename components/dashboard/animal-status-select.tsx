"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimalStatus } from "@prisma/client";

export function AnimalStatusSelect({
  animalId,
  currentStatus,
}: {
  animalId: string;
  currentStatus: AnimalStatus;
}) {
  const t = useTranslations("dashboard");
  const router  = useRouter();
  const [saving, setSaving] = useState(false);

  const OPTIONS: { value: AnimalStatus; labelKey: string }[] = [
    { value: "AVAILABLE",    labelKey: "animalsStatusAvailable" },
    { value: "PENDING",      labelKey: "animalsStatusPending" },
    { value: "ADOPTED",      labelKey: "animalsStatusAdopted" },
    { value: "FOSTER",       labelKey: "animalsStatusFoster" },
    { value: "MEDICAL_HOLD", labelKey: "animalsStatusMedicalHold" },
  ];

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
        <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
      ))}
    </select>
  );
}
