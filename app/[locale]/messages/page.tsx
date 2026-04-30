import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { MessageCircle, PawPrint } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages");
  return { title: t("title") };
}

export default async function MessagesPage() {
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations("messages"),
  ]);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/messages");

  const userId = session.user.id;
  const role   = session.user.role;

  const isShelterAdmin = role === "SHELTER_ADMIN";
  const isSuperAdmin   = role === "SUPER_ADMIN";

  let whereClause: Record<string, unknown> = {};
  if (isShelterAdmin) {
    const shelterAdmins = await prisma.shelterAdmin.findMany({
      where: { userId },
      select: { shelterId: true },
    });
    whereClause = { shelterId: { in: shelterAdmins.map((s) => s.shelterId) } };
  } else if (!isSuperAdmin) {
    whereClause = { userId };
  }

  const conversations = await prisma.conversation.findMany({
    where: whereClause,
    include: {
      animal: {
        select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } },
      },
      shelter: { select: { name: true } },
      user:    { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: { where: { senderId: { not: userId }, readAt: null } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <PawPrint className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-gray-500">{t("empty")}</p>
            <Link
              href="/animals"
              className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              {t("browseAnimals")}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const lastMsg = conv.messages[0];
              const unread  = conv._count.messages;
              const img     = conv.animal.images[0];

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/30",
                    unread > 0 ? "border-brand-200" : "border-gray-100"
                  )}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt={conv.animal.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <PawPrint className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-gray-900">{conv.animal.name}</p>
                      {lastMsg && (
                        <span className="shrink-0 text-xs text-gray-400">
                          {new Date(lastMsg.createdAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{conv.shelter.name}</p>
                    {(isShelterAdmin || isSuperAdmin) && (
                      <p className="text-xs text-gray-400">{conv.user.name ?? conv.user.email}</p>
                    )}
                    {lastMsg && (
                      <p className="mt-1 truncate text-sm text-gray-600">{lastMsg.content}</p>
                    )}
                  </div>

                  {unread > 0 && (
                    <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-bold text-white">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
