import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendNewMessageEmail } from "@/lib/email";
import { createNotification, createNotifications } from "@/lib/notifications";
import { blockIfSuspended } from "@/lib/account-status";

const schema = z.object({
  content:        z.string().max(2000).optional(),
  attachmentUrl:  z.string().url().optional(),
  attachmentName: z.string().max(255).optional(),
}).refine((d) => (d.content && d.content.trim().length > 0) || d.attachmentUrl, {
  message: "Üzenet szövege vagy csatolmány szükséges",
});

// POST /api/conversations/[id]/messages – send a message
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const suspended = await blockIfSuspended(session.user.id);
  if (suspended) return suspended;

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    select: {
      id:       true,
      userId:   true,
      shelterId: true,
      animal:   { select: { name: true } },
      user:     { select: { email: true, name: true } },
      shelter:  {
        select: {
          name:   true,
          admins: { select: { userId: true, user: { select: { email: true, name: true } } } },
        },
      },
    },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Nem található" }, { status: 404 });
  }

  // Access check
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isConversationUser = conversation.userId === session.user.id;
  let isShelterAdmin = false;
  if (session.user.role === "SHELTER_ADMIN") {
    const adminRecord = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: conversation.shelterId },
    });
    isShelterAdmin = !!adminRecord;
  }

  if (!isConversationUser && !isShelterAdmin && !isSuperAdmin) {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen üzenet" }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: params.id,
        senderId:       session.user.id,
        content:        parsed.data.content ?? null,
        attachmentUrl:  parsed.data.attachmentUrl  ?? null,
        attachmentName: parsed.data.attachmentName ?? null,
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    }),
    prisma.conversation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    }),
  ]);

  // Notify the other party (email + in-app, fire-and-forget)
  const BASE        = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";
  const convUrl     = `${BASE}/messages/${params.id}`;
  const animalName  = conversation.animal?.name ?? "Ismeretlen állat";
  const senderName  = session.user.name ?? "Ismeretlen";
  const preview     = parsed.data.content
    ? parsed.data.content.slice(0, 200)
    : `[Csatolmány: ${parsed.data.attachmentName ?? "fájl"}]`;
  const senderIsUser = conversation.userId === session.user.id;

  void (async () => {
    try {
      if (senderIsUser) {
        // Notify shelter admins
        const adminIds = (conversation.shelter?.admins ?? []).map((a) => a.userId).filter(Boolean) as string[];
        if (adminIds.length > 0) {
          await createNotifications(adminIds.map((uid) => ({
            userId: uid,
            type:   "NEW_MESSAGE" as const,
            title:  "Új üzenet",
            body:   `${senderName}: ${preview.slice(0, 80)}`,
            href:   `/messages/${params.id}`,
          })));
        }
        for (const admin of conversation.shelter?.admins ?? []) {
          if (admin.user.email) {
            await sendNewMessageEmail({
              to:              admin.user.email,
              recipientName:   admin.user.name ?? "Admin",
              senderName,
              animalName,
              preview,
              conversationUrl: convUrl,
            });
          }
        }
      } else {
        // Notify the conversation user
        await createNotification({
          userId: conversation.userId,
          type:   "NEW_MESSAGE",
          title:  "Új üzenet",
          body:   `${senderName}: ${preview.slice(0, 80)}`,
          href:   `/messages/${params.id}`,
        });
        if (conversation.user?.email) {
          await sendNewMessageEmail({
            to:              conversation.user.email,
            recipientName:   conversation.user.name ?? "Felhasználó",
            senderName,
            animalName,
            preview,
            conversationUrl: convUrl,
          });
        }
      }
    } catch (err) {
      console.error("Message notification failed:", err);
    }
  })();

  return NextResponse.json(message, { status: 201 });
}

// GET /api/conversations/[id]/messages – fetch messages (for polling)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    select: { userId: true, shelterId: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Nem található" }, { status: 404 });
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isConversationUser = conversation.userId === session.user.id;
  let isShelterAdmin = false;
  if (session.user.role === "SHELTER_ADMIN") {
    const adminRecord = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: conversation.shelterId },
    });
    isShelterAdmin = !!adminRecord;
  }

  if (!isConversationUser && !isShelterAdmin && !isSuperAdmin) {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Mark incoming as read
  await prisma.message.updateMany({
    where: { conversationId: params.id, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}
