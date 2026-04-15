import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const userId = session.user.id;
  const isShelterAdmin = session.user.role === "SHELTER_ADMIN";

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
}
