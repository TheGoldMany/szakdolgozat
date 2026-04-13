import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus, AnimalType } from "@prisma/client";

const TYPE_LABELS: Record<ReportType, { label: string; color: string; emoji: string }> = {
  LOST:  { label: "Elveszett", color: "bg-red-100 text-red-700",    emoji: "🔍" },
  FOUND: { label: "Megtalált", color: "bg-green-100 text-green-700", emoji: "🏠" },
  STRAY: { label: "Kóbor",     color: "bg-yellow-100 text-yellow-700", emoji: "🐾" },
};

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  ACTIVE:   { label: "Aktív",    color: "bg-blue-100 text-blue-700" },
  RESOLVED: { label: "Megoldva", color: "bg-gray-100 text-gray-500" },
  CLOSED:   { label: "Lezárt",   color: "bg-gray-100 text-gray-400" },
};

const ANIMAL_EMOJI: Record<AnimalType, string> = {
  DOG: "🐕", CAT: "🐈", RABBIT: "🐇", BIRD: "🦜", OTHER: "🐾",
};

interface ReportCardProps {
  report: {
    id: string;
    type: ReportType;
    status: ReportStatus;
    animalType: AnimalType;
    name: string | null;
    breed: string | null;
    color: string | null;
    city: string;
    address: string | null;
    description: string;
    contactName: string;
    contactPhone: string | null;
    contactEmail: string;
    createdAt: Date;
  };
}

export function ReportCard({ report }: ReportCardProps) {
  const type   = TYPE_LABELS[report.type];
  const status = STATUS_LABELS[report.status];

  return (
    <Link href={`/reports/${report.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{ANIMAL_EMOJI[report.animalType]}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", type.color)}>
                  {type.emoji} {type.label}
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                  {status.label}
                </span>
              </div>
              <h3 className="mt-1 font-semibold text-gray-900 group-hover:text-brand-500 transition-colors">
                {report.name ? `${report.name}` : report.breed ?? "Ismeretlen"}
                {report.breed && report.name ? ` (${report.breed})` : ""}
              </h3>
            </div>
          </div>
          <span className="shrink-0 text-xs text-gray-400">
            {new Date(report.createdAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-500 line-clamp-2">{report.description}</p>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {report.city}{report.address ? `, ${report.address}` : ""}
          </span>
          {report.color && <span>🎨 {report.color}</span>}
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="font-medium">{report.contactName}</span>
          {report.contactPhone && (
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{report.contactPhone}</span>
          )}
          <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{report.contactEmail}</span>
        </div>
      </div>
    </Link>
  );
}
