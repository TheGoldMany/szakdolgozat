import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Heart, MessageCircle, CalendarCheck, RefreshCcw,
  HandHelping, Home, Banknote,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MyCampaigns } from "@/components/profile/my-campaigns";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Profil admin" };
}

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
          <MyCampaigns campaigns={campaigns} />
        </section>

        {/* Egyéb szekciók */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-700">Egyéb funkciók</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LINKS.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/40"
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
