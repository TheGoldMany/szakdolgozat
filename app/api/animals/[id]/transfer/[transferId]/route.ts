import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendTransferResolvedEmail } from "@/lib/email";

const patchSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  note:   z.string().max(2000).optional(),
});

// PATCH /api/animals/[id]/transfer/[transferId] – jóváhagyás, elutasítás, visszavonás
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; transferId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const transfer = await prisma.animalTransfer.findUnique({
    where:   { id: params.transferId },
    include: {
      animal:      { select: { name: true, shelterId: true } },
      fromShelter: { select: { name: true } },
      toShelter:   { select: { name: true } },
      requestedBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!transfer) return NextResponse.json({ error: "Kérelem nem található" }, { status: 404 });
  if (transfer.status !== "PENDING") {
    return NextResponse.json({ error: "Ez a kérelem már lezárult" }, { status: 409 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  const { action, note } = parsed.data;

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  if (action === "CANCELLED") {
    // Only the requester (or super admin) may cancel
    if (!isSuperAdmin && transfer.requestedById !== session.user.id) {
      const isFromAdmin = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id, shelterId: transfer.fromShelterId },
      });
      if (!isFromAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
  } else {
    // APPROVED / REJECTED – only target shelter admin or super admin
    if (!isSuperAdmin) {
      const isToAdmin = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id, shelterId: transfer.toShelterId },
      });
      if (!isToAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
  }

  // Apply status and optionally move the animal
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.animalTransfer.update({
      where: { id: params.transferId },
      data: {
        status:      action,
        note:        note ?? null,
        resolvedById: action !== "CANCELLED" ? session.user.id : undefined,
        resolvedAt:  action !== "CANCELLED" ? new Date() : undefined,
      },
    });
    if (action === "APPROVED") {
      await tx.animal.update({
        where: { id: transfer.animalId },
        data:  { shelterId: transfer.toShelterId },
      });
    }
    return result;
  });

  // Notify requester
  if (action !== "CANCELLED") {
    createNotification({
      userId: transfer.requestedById,
      type:   action === "APPROVED" ? "TRANSFER_APPROVED" : "TRANSFER_REJECTED",
      title:  action === "APPROVED" ? "Áthelyezés jóváhagyva" : "Áthelyezés elutasítva",
      body:   `${transfer.animal.name} → ${transfer.toShelter.name}`,
      href:   "/dashboard/transfers",
    }).catch(() => {});

    if (transfer.requestedBy?.email) {
      sendTransferResolvedEmail({
        to:            transfer.requestedBy.email,
        requesterName: transfer.requestedBy.name ?? "Admin",
        animalName:    transfer.animal.name,
        toShelterName: transfer.toShelter.name,
        approved:      action === "APPROVED",
        note:          note ?? null,
      }).catch(() => {});
    }
  }

  return NextResponse.json(updated);
}
