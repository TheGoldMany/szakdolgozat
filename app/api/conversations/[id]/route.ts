import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/conversations/[id] – get full conversation with messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
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
  const isSuperAdmin = authUser.role === "SUPER_ADMIN";
  const isConversationUser = conversation.userId === authUser.id;

  let isShelterAdmin = false;
  if (authUser.role === "SHELTER_ADMIN") {
    const adminRecord = await prisma.shelterAdmin.findFirst({
      where: { userId: authUser.id, shelterId: conversation.shelterId },
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
      senderId: { not: authUser.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json(conversation);
}
