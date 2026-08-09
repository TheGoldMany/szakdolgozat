import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MessageCircle, PawPrint } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Üzenetek" };

export default async function DashboardMessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");
  const t = await getTranslations("dashboard");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterIds: string[] = [];
  if (!isSuperAdmin) {
    const admins = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id },
      select: { shelterId: true },
    });
    shelterIds = admins.map((a) => a.shelterId);
  }

  const conversations = await prisma.conversation.findMany({
    where: isSuperAdmin ? {} : { shelterId: { in: shelterIds } },
    include: {
      animal: {
        select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } },
      },
      shelter: { select: { name: true } },
      user: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Unread per conversation – egyetlen aggregált lekérdezés (N+1 elkerülése)
  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: session.user.id },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap: Record<string, number> = {};
  for (const g of unreadGroups) unreadMap[g.conversationId] = g._count._all;

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-brand-500" />
          <h1 className="text-xl font-bold text-gray-900">
            {t("messagesPageTitle")}
            {totalUnread > 0 && (
              <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                {t("messagesNewCount", { count: totalUnread })}
              </span>
            )}
          </h1>
          <PageInfo page="messages" />
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <PawPrint className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">{t("messagesEmpty")}</p>
          <p className="mt-1 text-sm text-gray-400">
            {t("messagesEmptyDesc")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">{t("messagesColAnimal")}</th>
                <th className="px-4 py-3 text-left">{t("messagesColUser")}</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">{t("messagesColLastMsg")}</th>
                <th className="px-4 py-3 text-left">{t("messagesColDate")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {conversations.map((conv) => {
                const img = conv.animal.images[0];
                const lastMsg = conv.messages[0];
                const unread = unreadMap[conv.id] ?? 0;

                return (
                  <tr
                    key={conv.id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      unread > 0 && "bg-brand-50/30"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.url} alt={conv.animal.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <PawPrint className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{conv.animal.name}</p>
                          {isSuperAdmin && (
                            <p className="text-xs text-gray-400">{conv.shelter.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{conv.user.name ?? "–"}</p>
                      <p className="text-xs text-gray-400">{conv.user.email}</p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {lastMsg ? (
                        <p className="max-w-[200px] truncate text-gray-600">{lastMsg.content}</p>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {lastMsg
                        ? new Date(lastMsg.createdAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })
                        : new Date(conv.createdAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/messages/${conv.id}`}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                          unread > 0
                            ? "bg-brand-500 text-white hover:bg-brand-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {unread > 0 ? t("messagesReply", { count: unread }) : t("messagesOpen")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
