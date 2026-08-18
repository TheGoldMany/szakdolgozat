import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { EmailNotificationsToggle } from "@/components/profile/email-notifications-toggle";
import { DownloadDataButton } from "@/components/profile/download-data-button";
import { DeleteAccountButton } from "@/components/profile/delete-account-button";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Beállítások" };
}

export default async function SettingsPage() {
  const t = await getTranslations("profile");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/settings");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { password: true, emailNotifications: true },
  });
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">

        <h1 className="mb-8 text-2xl font-bold text-gray-900">Beállítások</h1>

        <div className="space-y-6">

          {/* Change password – only for password-based accounts */}
          {user.password && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("changePassword")}</h2>
              <ChangePasswordForm />
            </div>
          )}

          {/* Notification preferences */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("notificationSettings")}</h2>
            <EmailNotificationsToggle enabled={user.emailNotifications} />
          </div>

          {/* GDPR data portability */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">{t("myData")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("myDataDesc")}</p>
            <DownloadDataButton />
          </div>

          {/* Danger zone – account deletion */}
          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-red-700">{t("dangerZone")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("deleteAccountDesc")}</p>
            <DeleteAccountButton />
          </div>

        </div>
      </div>
    </div>
  );
}
