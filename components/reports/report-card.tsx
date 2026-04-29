import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Search, Home, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus, AnimalType } from "@prisma/client";

const TYPE_CONFIG: Record<ReportType, { label: string; bg: string; text: string; Icon: React.ElementType }> = {
  LOST:  { label: "Elveszett", bg: "bg-rose-100",   text: "text-rose-700",   Icon: Search     },
  FOUND: { label: "Megtalált", bg: "bg-emerald-100", text: "text-emerald-700", Icon: Home      },
  STRAY: { label: "Kóbor",     bg: "bg-amber-100",  text: "text-amber-700",  Icon: Navigation },
};

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  ACTIVE:   { label: "Aktív",    color: "bg-sky-100 text-sky-700"     },
  RESOLVED: { label: "Megoldva", color: "bg-gray-100 text-gray-500"   },
  CLOSED:   { label: "Lezárt",   color: "bg-gray-100 text-gray-400"   },
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
    imageUrl: string | null;
    createdAt: Date;
  };
}

export function ReportCard({ report }: ReportCardProps) {
  const cfg    = TYPE_CONFIG[report.type];
  const status = STATUS_LABELS[report.status];
  const Icon   = cfg.Icon;

  return (
    <Link href={`/reports/${report.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">

        {/* Optional image */}
        {report.imageUrl && (
          <div className="relative h-40 w-full overflow-hidden bg-gray-100">
            <Image
              src={report.imageUrl}
              alt={report.name ?? report.breed ?? "Bejelentett állat"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Type icon */}
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", cfg.bg, cfg.text)}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cfg.bg, cfg.text)}>
                    {cfg.label}
                  </span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", status.color)}>
                    {status.label}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
                    {ANIMAL_LABELS[report.animalType]}
                  </span>
                </div>

                {/* Name */}
                <h3 className="mt-1.5 truncate font-semibold text-gray-900 transition-colors group-hover:text-brand-600">
                  {report.name
                    ? (report.breed ? `${report.name} (${report.breed})` : report.name)
                    : (report.breed ?? "Ismeretlen")}
                </h3>
              </div>
            </div>

            {/* Date */}
            <span className="shrink-0 text-xs text-gray-400">
              {new Date(report.createdAt).toLocaleDateString("hu-HU", {
                month: "short", day: "numeric",
              })}
            </span>
          </div>

          {/* Description */}
          <p className="mt-3 line-clamp-2 text-sm text-gray-500">{report.description}</p>

          {/* Location + color */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {report.city}{report.address ? `, ${report.address}` : ""}
            </span>
            {report.color && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-gray-300 bg-gray-200" />
                {report.color}
              </span>
            )}
          </div>

          {/* Contact */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{report.contactName}</span>
            {report.contactPhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {report.contactPhone}
              </span>
            )}
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              {report.contactEmail}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
