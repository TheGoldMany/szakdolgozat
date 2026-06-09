import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Bell } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Értesítések" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/notifications");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <Bell className="h-6 w-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Értesítések</h1>
        </div>

        <NotificationsCenter />
      </div>
    </div>
  );
}
