import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScrollText, Ban, RotateCcw, Trash2, UserCog, BadgeCheck, BadgeX, HandHeart, FileText, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditAction } from "@prisma/client";

export const metadata: Metadata = { title: "Audit napló" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_META: Record<AuditAction, { label: string; icon: LucideIcon; color: string }> = {
  USER_SUSPENDED:     { label: "Felhasználó felfüggesztve", icon: Ban,        color: "bg-amber-50 text-amber-700" },
  USER_REACTIVATED:   { label: "Felhasználó aktiválva",     icon: RotateCcw,  color: "bg-green-50 text-green-700" },
  USER_DELETED:       { label: "Felhasználó törölve",       icon: Trash2,     color: "bg-red-50 text-red-700" },
  USER_ROLE_CHANGED:  { label: "Szerepkör módosítva",       icon: UserCog,    color: "bg-blue-50 text-blue-700" },
  SHELTER_VERIFIED:   { label: "Menhely hitelesítve",       icon: BadgeCheck, color: "bg-green-50 text-green-700" },
  SHELTER_UNVERIFIED: { label: "Hitelesítés visszavonva",   icon: BadgeX,     color: "bg-amber-50 text-amber-700" },
  CAMPAIGN_APPROVED:  { label: "Gyűjtés jóváhagyva",        icon: HandHeart,  color: "bg-green-50 text-green-700" },
  CAMPAIGN_REJECTED:  { label: "Gyűjtés elutasítva",        icon: HandHeart,  color: "bg-red-50 text-red-700" },
  CAMPAIGN_EDITED:    { label: "Gyűjtés szerkesztve",       icon: HandHeart,  color: "bg-blue-50 text-blue-700" },
  CAMPAIGN_DELETED:   { label: "Gyűjtés törölve",           icon: Trash2,     color: "bg-red-50 text-red-700" },
  TIER_DELETED:       { label: "Támogatói csomag törölve",  icon: Trash2,     color: "bg-red-50 text-red-700" },
  SUBSCRIPTION_CANCELLED: { label: "Előfizetés lemondva",   icon: Ban,        color: "bg-amber-50 text-amber-700" },
  SUBSCRIPTION_DELETED:   { label: "Előfizetés törölve",    icon: Trash2,     color: "bg-red-50 text-red-700" },
  FORM_APPROVED:      { label: "Űrlap jóváhagyva",          icon: FileText,   color: "bg-green-50 text-green-700" },
  FORM_REJECTED:      { label: "Űrlap elutasítva",          icon: FileText,   color: "bg-red-50 text-red-700" },
};

/**
 * Audit napló – az adminisztrátori műveletek visszakövethető listája.
 * Csak olvasható, kizárólag SUPER_ADMIN számára.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/audit");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // Vitatott tételek: ezek a platform egyenlegét terhelik, ezért a napló
  // tetején, nem a bejegyzések közé keverve jelennek meg.
  const disputes = await prisma.paymentDispute.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Audit napló</h1>
          <span className="text-sm font-normal text-gray-400">({total})</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Ki, mit és mikor módosított a platformon. A bejegyzések nem szerkeszthetők.
        </p>
      </div>

      {disputes.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-red-800">
            <AlertTriangle className="h-4 w-4" />
            Vitatott fizetések ({disputes.length})
          </h2>
          <p className="mb-3 text-xs text-red-700">
            A vitatott összeg és a Stripe vitadíja is a platform egyenlegét terheli.
            A Stripe Dashboardon határidőre bizonyítékot kell feltölteni.
          </p>
          <ul className="space-y-2">
            {disputes.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2 text-xs">
                <span className="font-bold text-gray-900">
                  {d.amount.toLocaleString("hu-HU")} Ft
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">{d.status}</span>
                <span className="text-gray-500">{d.reason}</span>
                <span className="ml-auto text-gray-400">
                  {new Date(d.createdAt).toLocaleString("hu-HU", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-gray-200" />
          <p className="text-sm text-gray-400">Még nincs naplózott művelet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const meta = ACTION_META[e.action];
            const Icon = meta.icon;
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.color)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {meta.label}
                    {e.targetName && <span className="text-gray-500"> — {e.targetName}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {e.actor?.name ?? e.actor?.email ?? "ismeretlen admin"}
                    {" · "}
                    {new Date(e.createdAt).toLocaleString("hu-HU", {
                      year: "numeric", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  {e.reason && (
                    <p className="mt-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600">{e.reason}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">{page} / {pages} oldal</p>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`/dashboard/audit?page=${page - 1}`}
                 className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                Előző
              </a>
            )}
            {page < pages && (
              <a href={`/dashboard/audit?page=${page + 1}`}
                 className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                Következő
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
