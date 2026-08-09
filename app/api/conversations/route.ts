import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAuthUser, requireAuthUser } from "@/lib/api-auth";

// POST /api/conversations – create or find conversation for an animal
const createSchema = z.object({
  animalId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

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
    where: { animalId_userId: { animalId, userId: user!.id } },
    update: {},
    create: {
      animalId,
      userId: user!.id,
      shelterId: animal.shelterId,
    },
  });

  return NextResponse.json({ conversationId: conversation.id }, { status: 200 });
}

// GET /api/conversations – list conversations for the current user or shelter admin
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isShelterAdmin =
    authUser.role === "SHELTER_ADMIN" || authUser.role === "SUPER_ADMIN";

  let conversations;

  if (isShelterAdmin) {
    // Find shelter(s) this admin manages
    const shelterAdmins = await prisma.shelterAdmin.findMany({
      where: { userId: authUser.id },
      select: { shelterId: true },
    });
    const shelterIds = shelterAdmins.map((s) => s.shelterId);

    conversations = await prisma.conversation.findMany({
      where: authUser.role === "SUPER_ADMIN"
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
      where: { userId: authUser.id },
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

  // Add unread counts – egyetlen aggregált lekérdezés (N+1 elkerülése)
  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: authUser.id },
      readAt: null,
    },
    _count: { _all: true },
  });
  const unreadMap = new Map(unreadGroups.map((g) => [g.conversationId, g._count._all]));

  const enriched = conversations.map((conv) => ({
    ...conv,
    unreadCount: unreadMap.get(conv.id) ?? 0,
  }));

  return NextResponse.json(enriched);
}
