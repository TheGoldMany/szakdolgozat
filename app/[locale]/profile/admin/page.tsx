import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Heart, MessageCircle, CalendarCheck, RefreshCcw,
  HandHelping, Home, Banknote, PlusCircle,
  ExternalLink,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CampaignStatus } from "@prisma/client";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Profil admin" };
}

const STATUS_LABEL: Record<CampaignStatus, { label: string; color: string }> = {
  PENDING:   { label: "Jóváhagyásra vár", color: "bg-yellow-50 text-yellow-700" },
  ACTIVE:    { label: "Aktív",             color: "bg-green-50 text-green-700" },
  REJECTED:  { label: "Elutasítva",        color: "bg-red-50 text-red-600" },
  COMPLETED: { label: "Lezárt",            color: "bg-gray-100 text-gray-500" },
};

export default async function ProfileAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/profile/admin");

  const t = await getTranslations("nav");

  const campaigns = await prisma.campaign.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id:           true,
      title:        true,
      slug:         true,
      status:       true,
      targetAmount: true,
      createdAt:    true,
      shelter:      { select: { name: true } },
      _count:       { select: { donations: true } },
      donations: {
        where:  { paidAt: { not: null } },
        select: { amount: true },
      },
    },
  });

  const LINKS = [
    { href: "/favorites",    icon: Heart,         label: t("favorites"),        desc: "Mentett állatok és menhelyek" },
    { href: "/messages",     icon: MessageCircle, label: t("myMessages"),       desc: "Beérkező és kimenő üzenetek" },
    { href: "/appointments", icon: CalendarCheck, label: t("myAppointments"),   desc: "Megbeszélt időpontjaid" },
    { href: "/followups",    icon: RefreshCcw,    label: t("myFollowups"),      desc: "Örökbefogadás utánkövetések" },
    { href: "/volunteers",   icon: HandHelping,   label: t("myVolunteers"),     desc: "Önkéntes tevékenységed" },
    { href: "/foster",       icon: Home,          label: t("myFoster"),         desc: "Ideiglenes befogadásaid" },
    { href: "/finances",     icon: Banknote,      label: t("myFinances"),       desc: "Adományaid és előfizetéseid" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        <h1 className="mb-8 text-2xl font-bold text-gray-900">{t("profileAdmin")}</h1>

        {/* Gyűjtések szekció */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">{t("myCampaigns")}</h2>
            <Link
              href="/campaigns/new"
              className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Új gyűjtés
            </Link>
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
              <p className="text-sm text-gray-400">Még nincs gyűjtésed.</p>
              <Link href="/campaigns/new" className="mt-3 inline-block text-sm font-medium text-brand-500 hover:underline">
                Indíts egyet most
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((c) => {
                const raised = c.donations.reduce((s, d) => s + d.amount, 0);
                const pct    = Math.min(100, Math.round((raised / c.targetAmount) * 100));
                const st     = STATUS_LABEL[c.status];
                return (
                  <li key={c.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">{c.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                        </div>
                        {c.shelter && (
                          <p className="text-xs text-gray-400 mb-2">{c.shelter.name}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{raised.toLocaleString("hu-HU")} / {c.targetAmount.toLocaleString("hu-HU")} Ft</span>
                          <span>·</span>
                          <span>{c._count.donations} adomány</span>
                        </div>
                        {c.status === "ACTIVE" && (
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                      {c.status === "ACTIVE" && (
                        <Link
                          href={`/donate/${c.id}`}
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Megtekintés
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Egyéb szekciók */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-700">Egyéb funkciók</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LINKS.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{label}</p>
                  <p className="truncate text-xs text-gray-400">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
