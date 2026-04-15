import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Search, Home, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus, AnimalType } from "@prisma/client";

const TYPE_CONFIG: Record<ReportType, { label: string; color: string; Icon: React.ElementType }> = {
  LOST:  { label: "Elveszett", color: "bg-red-100 text-red-700",      Icon: Search },
  FOUND: { label: "Megtalált", color: "bg-brand-100 text-brand-700",  Icon: Home },
  STRAY: { label: "Kóbor",     color: "bg-yellow-100 text-yellow-700", Icon: Navigation },
};

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  ACTIVE:   { label: "Aktív",    color: "bg-blue-100 text-blue-700" },
  RESOLVED: { label: "Megoldva", color: "bg-gray-100 text-gray-500" },
  CLOSED:   { label: "Lezárt",   color: "bg-gray-100 text-gray-400" },
};

const ANIMAL_LABELS: Record<AnimalType, string> = {
  DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb",
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
    imageUrl:     string | null;
    createdAt: Date;
  };
}

export function ReportCard({ report }: ReportCardProps) {
  const typeConfig = TYPE_CONFIG[report.type];
  const status     = STATUS_LABELS[report.status];
  const Icon       = typeConfig.Icon;

  return (
    <Link href={`/reports/${report.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
        {report.imageUrl && (
          <div className="relative h-40 w-full bg-gray-100">
            <Image
              src={report.imageUrl}
              alt={report.name ?? report.breed ?? "Bejelentett állat"}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}
        <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", typeConfig.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", typeConfig.color)}>
                  {typeConfig.label}
                </span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                  {status.label}
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                  {ANIMAL_LABELS[report.animalType]}
                </span>
              </div>
              <h3 className="mt-1.5 font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                {report.name
                  ? report.breed ? `${report.name} (${report.breed})` : report.name
                  : report.breed ?? "Ismeretlen"}
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
          {report.color && (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-gray-200 bg-gray-300" />
              {report.color}
            </span>
          )}
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="font-medium">{report.contactName}</span>
          {report.contactPhone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {report.contactPhone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {report.contactEmail}
          </span>
        </div>
        </div>
      </div>
    </Link>
  );
}
