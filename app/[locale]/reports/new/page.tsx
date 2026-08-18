import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getServerSession } from "next-auth/next";
import { Info } from "lucide-react";
import { authOptions } from "@/lib/auth";
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
  const isGuest = !session?.user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/reports" className="hover:text-brand-500">{t("title")}</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">{t("newTitle")}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("newTitle")}</h1>
          <p className="mt-2 text-gray-500">{t("newDesc")}</p>
        </div>

        {isGuest && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">{t("guestNotice")}</p>
              <p className="mt-0.5 text-blue-700">
                {t("guestNoticeDesc")}{" "}
                <Link
                  href="/auth/login?callbackUrl=/reports/new"
                  className="font-semibold underline hover:text-blue-900"
                >
                  {t("guestLoginLink")}
                </Link>{" "}
                ezeket az adatokat automatikusan kitöltjük.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <ReportForm />
        </div>
      </div>
    </div>
  );
}
