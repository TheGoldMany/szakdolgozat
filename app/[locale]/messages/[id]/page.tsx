import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { MapPin, Phone, Mail, Globe, ArrowLeft, PawPrint } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatWindow } from "@/components/chat/chat-window";
import { InviteSender } from "@/components/messages/invite-sender";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("messages");
  return { title: t("title") };
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const [session, t] = await Promise.all([
    getServerSession(authOptions),
    getTranslations("messages"),
  ]);
  if (!session?.user?.id) redirect(`/auth/login?callbackUrl=/messages/${params.id}`);

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      animal: {
        select: {
          id: true, name: true, slug: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      shelter: {
        select: {
          id: true, name: true, slug: true, phone: true,
          email: true, website: true, city: true, address: true,
        },
      },
      user: { select: { id: true, name: true } },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) notFound();

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isConversationUser = conversation.userId === session.user.id;
  let isShelterAdmin = false;
  if (session.user.role === "SHELTER_ADMIN") {
    const rec = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: conversation.shelterId },
    });
    isShelterAdmin = !!rec;
  }
  if (!isConversationUser && !isShelterAdmin && !isSuperAdmin) redirect("/messages");

  // For shelter admin: fetch approved forms and check if invite can be sent
  let approvedForms: { id: string; title: string }[] = [];
  let canSendInvite = false;
  if (isShelterAdmin) {
    const [forms, existingApp] = await Promise.all([
      prisma.applicationForm.findMany({
        where:   { shelterId: conversation.shelterId, status: "APPROVED" },
        select:  { id: true, title: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.adoptionApplication.findFirst({
        where: {
          animalId: conversation.animal.id,
          userId:   conversation.userId,
          status:   { in: ["INVITED", "PENDING", "REVIEWING"] },
        },
        select: { id: true },
      }),
    ]);
    approvedForms = forms;
    canSendInvite = forms.length > 0 && !existingApp;
  }

  await prisma.message.updateMany({
    where: { conversationId: params.id, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  const img = conversation.animal.images[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        <div className="mb-4">
          <Link href="/messages" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("backToMessages")}
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">

          {/* Chat panel */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ height: "70vh" }}>
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={conversation.animal.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><PawPrint className="h-5 w-5 text-gray-300" /></div>
                )}
              </div>
              <div>
                <Link href={`/animals/${conversation.animal.slug}`} className="font-semibold text-gray-900 hover:text-brand-500 transition-colors">
                  {conversation.animal.name}
                </Link>
                <p className="text-xs text-gray-500">{conversation.shelter.name}</p>
              </div>
              {isShelterAdmin && (
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400">{t("user")}</p>
                  <p className="text-sm font-medium text-gray-700">{conversation.user.name}</p>
                </div>
              )}
            </div>

            <ChatWindow
              conversationId={params.id}
              currentUserId={session.user.id}
              initialMessages={conversation.messages.map((m) => ({
                ...m,
                createdAt:    m.createdAt.toISOString(),
                type:         m.type,
                inviteToken:  m.inviteToken ?? null,
                sender:       { ...m.sender, name: m.sender.name ?? null, role: m.sender.role as string },
              }))}
            />
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            {isShelterAdmin && canSendInvite && (
              <InviteSender
                conversationId={params.id}
                approvedForms={approvedForms}
              />
            )}
            {isShelterAdmin && !canSendInvite && approvedForms.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-sm text-gray-500">
                Már létezik aktív kérvény ehhez a felhasználóhoz és állathoz.
              </div>
            )}
            {isConversationUser && (
              <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-1.5">
                  Hogyan működik?
                </p>
                <p className="text-sm text-brand-800 leading-relaxed">
                  Küldd el az üzenetedet, és a menhely hamarosan visszajeleznek. Ha a menhely alkalmasnak talál, meghívót küld az örökbefogadási kérvény kitöltéséhez.
                </p>
              </div>
            )}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">{t("animalInfo")}</h2>
              <Link
                href={`/animals/${conversation.animal.slug}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={conversation.animal.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><PawPrint className="h-6 w-6 text-gray-300" /></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{conversation.animal.name}</p>
                  <p className="text-xs text-brand-500">{t("viewProfile")}</p>
                </div>
              </Link>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">{t("shelterContact")}</h2>
              <Link
                href={`/shelters/${conversation.shelter.slug}`}
                className="font-medium text-brand-500 hover:underline text-sm"
              >
                {conversation.shelter.name}
              </Link>

              <div className="mt-3 space-y-2">
                {conversation.shelter.city && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span>{conversation.shelter.city}{conversation.shelter.address ? `, ${conversation.shelter.address}` : ""}</span>
                  </div>
                )}
                {conversation.shelter.phone && (
                  <a href={`tel:${conversation.shelter.phone}`} className="flex items-center gap-2 text-sm text-brand-500 hover:underline">
                    <Phone className="h-4 w-4 shrink-0" />
                    {conversation.shelter.phone}
                  </a>
                )}
                {conversation.shelter.email && (
                  <a href={`mailto:${conversation.shelter.email}`} className="flex items-center gap-2 text-sm text-brand-500 hover:underline">
                    <Mail className="h-4 w-4 shrink-0" />
                    {conversation.shelter.email}
                  </a>
                )}
                {conversation.shelter.website && (
                  <a href={conversation.shelter.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-brand-500 hover:underline">
                    <Globe className="h-4 w-4 shrink-0" />
                    {t("website")}
                  </a>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
