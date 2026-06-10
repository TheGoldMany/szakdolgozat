"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AddAnimalForm } from "./add-animal-form";

export function AddAnimalPanel() {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("animalsAddButton")}
        </button>
      )}

      {open && (
        <div className="mt-4 rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">{t("animalsAddPanelTitle")}</h2>
          <AddAnimalForm onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
