import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// POST /api/conversations – create or find conversation for an animal
const createSchema = z.object({
  animalId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adat" }, { status: 400 });
  }

  const { animalId } = parsed.data;

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: { id: true, shelterId: true, name: true },
  });
  if (!animal) {
    return NextResponse.json({ error: "Állat nem található" }, { status: 404 });
  }

  // Upsert conversation (one per animal+user pair)
  const conversation = await prisma.conversation.upsert({
    where: { animalId_userId: { animalId, userId: session.user.id } },
    update: {},
    create: {
      animalId,
      userId: session.user.id,
      shelterId: animal.shelterId,
    },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 200 });
}

// GET /api/conversations – list conversations for the current user or shelter admin
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isShelterAdmin =
    session.user.role === "SHELTER_ADMIN" || session.user.role === "SUPER_ADMIN";

  let conversations;

  if (isShelterAdmin) {
    // Find shelter(s) this admin manages
    const shelterAdmins = await prisma.shelterAdmin.findMany({
      where: { userId: session.user.id },
      select: { shelterId: true },
    });
    const shelterIds = shelterAdmins.map((s) => s.shelterId);

    conversations = await prisma.conversation.findMany({
      where: session.user.role === "SUPER_ADMIN"
        ? {}
        : { shelterId: { in: shelterIds } },
      include: {
        animal: { select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
        shelter: { select: { name: true, slug: true } },
        user:   { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  } else {
    conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      include: {
        animal: { select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
        shelter: { select: { name: true, slug: true } },
        user:   { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Add unread counts
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const unread = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: session.user!.id },
          readAt: null,
        },
      });
      return { ...conv, unreadCount: unread };
    })
  );

  return NextResponse.json(enriched);
}
