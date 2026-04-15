import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { MapPin, Phone, Mail, Calendar, Search, Home, Navigation } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResolveButton } from "@/components/reports/resolve-button";
import { cn } from "@/lib/utils";
import { ReportType, ReportStatus } from "@prisma/client";

const TYPE_LABELS: Record<ReportType, { label: string; color: string; bgColor: string; Icon: React.ElementType }> = {
  LOST:  { label: "Elveszett", color: "bg-red-100 text-red-700",       bgColor: "bg-red-50",    Icon: Search },
  FOUND: { label: "Megtalált", color: "bg-brand-100 text-brand-700",   bgColor: "bg-brand-50",  Icon: Home },
  STRAY: { label: "Kóbor",     color: "bg-yellow-100 text-yellow-700", bgColor: "bg-yellow-50", Icon: Navigation },
};

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  ACTIVE:   { label: "Aktív",    color: "bg-blue-100 text-blue-700" },
  RESOLVED: { label: "Megoldva", color: "bg-gray-100 text-gray-500" },
  CLOSED:   { label: "Lezárt",   color: "bg-gray-100 text-gray-400" },
};

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const r = await prisma.animalReport.findUnique({ where: { id: params.id }, select: { type: true, city: true } });
  if (!r) return { title: "Nem található" };
  return { title: `${TYPE_LABELS[r.type].label} – ${r.city}` };
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const [report, session] = await Promise.all([
    prisma.animalReport.findUnique({ where: { id: params.id } }),
    getServerSession(authOptions),
  ]);

  if (!report) notFound();

  const typeConfig = TYPE_LABELS[report.type];
  const status     = STATUS_LABELS[report.status];
  const Icon       = typeConfig.Icon;

  const isOwner    = session?.user?.id && report.userId === session.user.id;
  const isAdmin    = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "SHELTER_ADMIN";
  const canResolve = (isOwner || isAdmin) && report.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/reports" className="hover:text-brand-500">Bejelentések</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">{typeConfig.label}</span>
        </nav>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Fejléc sáv */}
          <div className={cn("px-6 py-5 flex items-center justify-between gap-3", typeConfig.bgColor)}>
            <div className="flex items-center gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", typeConfig.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", typeConfig.color)}>
                  {typeConfig.label}
                </span>
                <h1 className="mt-1 text-xl font-bold text-gray-900">
                  {report.name ?? report.breed ?? "Ismeretlen állat"}
                  {report.name && report.breed && ` (${report.breed})`}
                </h1>
              </div>
            </div>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", status.color)}>
              {status.label}
            </span>
          </div>

          <div className="p-6 space-y-5">
            {/* Adatok */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {report.color  && (
                <div>
                  <span className="text-gray-400">Szín:</span>{" "}
                  <span className="font-medium">{report.color}</span>
                </div>
              )}
              {report.gender && (
                <div>
                  <span className="text-gray-400">Nem:</span>{" "}
                  <span className="font-medium">
                    {report.gender === "MALE" ? "Hím" : report.gender === "FEMALE" ? "Nőstény" : "Ismeretlen"}
                  </span>
                </div>
              )}
            </div>

            {/* Leírás */}
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Leírás</h2>
              <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">{report.description}</p>
            </div>

            {/* Helyszín */}
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span>{report.city}{report.address ? `, ${report.address}` : ""}</span>
            </div>

            {/* Dátum */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="h-4 w-4" />
              {new Date(report.createdAt).toLocaleDateString("hu-HU", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </div>

            {/* Kapcsolat */}
            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">
                Kapcsolattartó: {report.contactName}
              </p>
              {report.contactPhone && (
                <a href={`tel:${report.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                  <Phone className="h-4 w-4" />
                  {report.contactPhone}
                </a>
              )}
              <a href={`mailto:${report.contactEmail}`}
                className="flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <Mail className="h-4 w-4" />
                {report.contactEmail}
              </a>
            </div>

            {canResolve && <ResolveButton reportId={report.id} />}
          </div>
        </div>
      </div>
    </div>
  );
}
