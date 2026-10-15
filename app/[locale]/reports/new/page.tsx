import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Camera, Clock, MapPinned, ScanEye } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportForm } from "@/components/reports/report-form";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("newTitle") };
}

export default async function NewReportPage() {
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations("reports"),
  ]);
  const userId = session?.user?.id;

  // Bejelentkezve az elérhetőség előre kitöltve (a vendégértesítő ezt ígéri).
  const me = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true } })
    : null;

  const tips = [
    { icon: Camera,    text: t("tip1") },
    { icon: MapPinned, text: t("tip2") },
    { icon: ScanEye,   text: t("tip3") },
    { icon: Clock,     text: t("tip4") },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>

        <header className="mt-5 max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("newTitle")}</h1>
          <p className="mt-2 text-gray-600">{t("newDesc")}</p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-7">
            <ReportForm
              defaults={me ? {
                contactName:  me.name  ?? undefined,
                contactEmail: me.email ?? undefined,
                contactPhone: me.phone ?? undefined,
              } : undefined}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {!userId && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm">
                <p className="font-semibold text-gray-900">{t("guestNotice")}</p>
                <p className="mt-1 leading-relaxed text-gray-600">
                  {t.rich("guestNoticeDesc", {
                    login: (chunks) => (
                      <Link href="/auth/login?callbackUrl=/reports/new" className="font-semibold text-brand-700 underline underline-offset-2">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </div>
            )}

            <div className="rounded-xl bg-brand-50 p-5">
              <h2 className="font-display text-base font-semibold text-forest">{t("tipsTitle")}</h2>
              <ul className="mt-3 space-y-3">
                {tips.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
