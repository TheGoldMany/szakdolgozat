"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Building2, PawPrint, CheckCircle, XCircle, Hourglass, Star } from "lucide-react";
import { useTranslations } from "next-intl";

export interface AppointmentData {
  id:          string;
  status:      "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  proposedAt:  string;
  confirmedAt: string | null;
  note:        string | null;
  adminNote:   string | null;
  cancelledBy: string | null;
  shelter:     { name: string; city: string; slug: string };
  animal:      { name: string; slug: string } | null;
}

interface Props {
  appt:       AppointmentData;
  showCancel?: boolean;
}

export function AppointmentCard({ appt, showCancel = true }: Props) {
  const router = useRouter();
  const t  = useTranslations("appointments");
  const [loading, setLoading] = useState(false);

  const STATUS_CONFIG = {
    PENDING:   { label: t("statusPending"),   icon: Hourglass,   color: "text-amber-600 bg-amber-50"  },
    CONFIRMED: { label: t("statusConfirmed"), icon: CheckCircle, color: "text-green-600 bg-green-50"  },
    CANCELLED: { label: t("statusCancelled"), icon: XCircle,     color: "text-red-600 bg-red-50"      },
    COMPLETED: { label: t("statusCompleted"), icon: Star,        color: "text-blue-600 bg-blue-50"    },
  };

  const cfg  = STATUS_CONFIG[appt.status];
  const Icon = cfg.icon;
  const displayTime = appt.confirmedAt ?? appt.proposedAt;

  async function handleCancel() {
    if (!confirm(t("cancelConfirm"))) return;
    setLoading(true);
    await fetch(`/api/appointments/${appt.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "CANCEL" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}>
              <Icon className="h-3 w-3" /> {cfg.label}
            </span>
            {appt.confirmedAt && (
              <span className="text-xs text-gray-400">
                ({t("modifiedTime")})
              </span>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-1.5 text-gray-700">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="font-medium">{new Date(displayTime).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{new Date(displayTime).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span>{appt.shelter.name} – {appt.shelter.city}</span>
            </div>
            {appt.animal && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <PawPrint className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span>{appt.animal.name}</span>
              </div>
            )}
          </div>

          {appt.note && (
            <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{t("yourNote")}</span> {appt.note}
            </p>
          )}
          {appt.adminNote && (
            <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
              <span className="font-medium">{t("shelterReply")}</span> {appt.adminNote}
            </p>
          )}
          {appt.status === "CANCELLED" && appt.cancelledBy && (
            <p className="mt-1.5 text-xs text-gray-400">
              {t("cancelledBy")}: {appt.cancelledBy === "USER" ? t("cancelledByUser") : t("cancelledByShelter")}
            </p>
          )}
          {appt.confirmedAt && appt.proposedAt !== appt.confirmedAt && (
            <p className="mt-1.5 text-xs text-gray-400">
              {t("proposedTime")}: {new Date(appt.proposedAt).toLocaleString("hu-HU", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {showCancel && appt.status === "PENDING" && (
          <button onClick={handleCancel} disabled={loading}
            className="shrink-0 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
            {t("cancelButton")}
          </button>
        )}
      </div>
    </div>
  );
}
