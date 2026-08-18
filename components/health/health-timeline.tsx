import { Syringe, Stethoscope, Scissors, HeartPulse, Bug, ClipboardCheck } from "lucide-react";
import { HealthRecordType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TYPE_CONFIG: Record<HealthRecordType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  VACCINATION: { label: "Oltás",          icon: Syringe,       color: "text-blue-600",   bg: "bg-blue-50"   },
  TREATMENT:   { label: "Kezelés",        icon: HeartPulse,    color: "text-red-600",    bg: "bg-red-50"    },
  VET_VISIT:   { label: "Állatorvos",     icon: Stethoscope,   color: "text-green-600",  bg: "bg-green-50"  },
  SURGERY:     { label: "Műtét",          icon: Scissors,      color: "text-purple-600", bg: "bg-purple-50" },
  DEWORMING:   { label: "Féreghajtás",    icon: Bug,           color: "text-orange-600", bg: "bg-orange-50" },
  CHECKUP:     { label: "Általános vizsgálat", icon: ClipboardCheck, color: "text-gray-600", bg: "bg-gray-50" },
};

interface Props { animalId: string }

export async function HealthTimeline({ animalId }: Props) {
  const records = await prisma.healthRecord.findMany({
    where:   { animalId },
    orderBy: { date: "desc" },
    take:    20,
  });

  if (records.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <HeartPulse className="h-4 w-4 text-brand-500" />
        Egészségügyi napló
      </h2>

      <ol className="relative border-l border-gray-200 pl-5">
        {records.map(r => {
          const cfg = TYPE_CONFIG[r.type];
          const Icon = cfg.icon;
          return (
            <li key={r.id} className="mb-5 last:mb-0">
              <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${cfg.bg}`}>
                <Icon className={`h-3 w-3 ${cfg.color}`} />
              </span>

              <div className="flex flex-wrap items-start justify-between gap-1">
                <div>
                  <span className={`mr-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{r.title}</span>
                </div>
                <time className="text-xs text-gray-400">
                  {new Date(r.date).toLocaleDateString("hu-HU")}
                </time>
              </div>

              {r.description && (
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{r.description}</p>
              )}
              {r.vetName && (
                <p className="mt-0.5 text-xs text-gray-400">Állatorvos: {r.vetName}</p>
              )}
              {r.nextDueDate && (
                <p className="mt-0.5 text-xs text-amber-600">
                  Következő: {new Date(r.nextDueDate).toLocaleDateString("hu-HU")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
