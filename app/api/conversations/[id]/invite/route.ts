import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createId } from "@paralleldrive/cuid2";

// POST /api/conversations/[id]/invite
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SHELTER_ADMIN") {
    return NextResponse.json({ error: "Csak menhely admin küldhet meghívót" }, { status: 403 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    select: {
      id:       true,
      userId:   true,
      animalId: true,
      shelterId: true,
    },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Beszélgetés nem található" }, { status: 404 });
  }

  // Verify shelter admin belongs to this conversation's shelter
  const adminRecord = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: conversation.shelterId },
  });
  if (!adminRecord) {
    return NextResponse.json({ error: "Nincs hozzáférés ehhez a beszélgetéshez" }, { status: 403 });
  }

  const body = await req.json();
  const { formId } = body as { formId?: string };
  if (!formId) {
    return NextResponse.json({ error: "formId megadása kötelező" }, { status: 400 });
  }

  // Check form is APPROVED and belongs to this shelter
  const form = await prisma.applicationForm.findUnique({
    where: { id: formId },
    select: { id: true, status: true, shelterId: true },
  });
  if (!form || form.shelterId !== conversation.shelterId) {
    return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
  }
  if (form.status !== "APPROVED") {
    return NextResponse.json({ error: "Csak jóváhagyott sablon alapján küldhető meghívó" }, { status: 409 });
  }

  // Check for existing INVITED or PENDING application for this animal+user
  const existing = await prisma.adoptionApplication.findFirst({
    where: {
      animalId: conversation.animalId,
      userId:   conversation.userId,
      status:   { in: ["INVITED", "PENDING", "REVIEWING"] },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Már létezik aktív kérelem ehhez az állathoz" }, { status: 409 });
  }

  const inviteToken = createId();

  // Create application with INVITED status and the token
  const application = await prisma.adoptionApplication.create({
    data: {
      userId:      conversation.userId,
      animalId:    conversation.animalId,
      formId:      form.id,
      inviteToken,
      status:      "INVITED",
    },
  });

  // Create the invite message
  await prisma.message.create({
    data: {
      conversationId: params.id,
      senderId:       session.user.id,
      content:        "Kérvény meghívó",
      type:           "INVITE",
      inviteToken,
    },
  });

  // Update conversation updatedAt
  await prisma.conversation.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ inviteToken, applicationId: application.id }, { status: 201 });
}
