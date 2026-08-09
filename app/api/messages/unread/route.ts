import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return NextResponse.json({ count: 0 });

  try {
    const userId = authUser.id;
    const isShelterAdmin = authUser.role === "SHELTER_ADMIN";

    let conversationFilter = {};

    if (isShelterAdmin) {
      const adminRecord = await prisma.shelterAdmin.findFirst({
        where: { userId },
        select: { shelterId: true },
      });
      conversationFilter = adminRecord
        ? { OR: [{ userId }, { shelterId: adminRecord.shelterId }] }
        : { userId };
    } else {
      conversationFilter = { userId };
    }

    const count = await prisma.message.count({
      where: {
        senderId: { not: userId },
        readAt:   null,
        conversation: conversationFilter,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('[api/messages/unread GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
