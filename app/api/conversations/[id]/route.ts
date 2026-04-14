import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/conversations/[id] – get full conversation with messages
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
    include: {
      animal: {
        select: {
          id: true, name: true, slug: true, type: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      },
      shelter: {
        select: {
          id: true, name: true, slug: true,
          phone: true, email: true, website: true, city: true, address: true,
        },
      },
      user: { select: { id: true, name: true, email: true } },
      messages: {
        include: { sender: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Nem található" }, { status: 404 });
  }

  // Access check: user must be the conversation's user, or a shelter admin for this shelter, or super admin
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

  // Mark messages from the other party as read
  await prisma.message.updateMany({
    where: {
      conversationId: params.id,
      senderId: { not: session.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json(conversation);
}
