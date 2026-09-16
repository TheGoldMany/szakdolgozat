import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { authOptions } from "@/lib/auth";
import { DailyCalendar } from "@/components/daily/daily-calendar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("daily");
  // A saját, lejárt képek archívuma nem publikus tartalom.
  return { title: t("calendarTitle"), robots: { index: false, follow: false } };
}

export default async function DailyCalendarPage() {
  const t       = await getTranslations("daily");
  const tNav    = await getTranslations("nav");
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <CalendarDays className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-4 text-sm text-gray-600">{t("loginRequired")}</p>
        <Link
          href="/auth/login"
          className="press mt-6 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          {tNav("login")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <CalendarDays className="h-6 w-6 text-brand-500" />
            {t("calendarTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{t("calendarIntro")}</p>
        </div>
        <DailyCalendar />
      </div>
    </div>
  );
}
