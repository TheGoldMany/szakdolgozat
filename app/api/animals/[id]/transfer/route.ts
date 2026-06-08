import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { sendTransferRequestEmail } from "@/lib/email";

const BASE = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";

const createSchema = z.object({
  toShelterId: z.string().cuid(),
  note:        z.string().max(2000).optional(),
});

// POST /api/animals/[id]/transfer – kérelem küldése a célmenhely adminnak
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const animal = await prisma.animal.findUnique({
    where:   { id: params.id },
    include: { shelter: { select: { name: true, id: true } } },
  });
  if (!animal) return NextResponse.json({ error: "Állat nem található" }, { status: 404 });

  // Only from-shelter admin (or super admin) may request
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: animal.shelterId },
    });
    if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  const { toShelterId, note } = parsed.data;

  if (toShelterId === animal.shelterId) {
    return NextResponse.json({ error: "A forrás- és célmenhely nem lehet azonos" }, { status: 400 });
  }

  const toShelter = await prisma.shelter.findUnique({ where: { id: toShelterId }, select: { name: true } });
  if (!toShelter) return NextResponse.json({ error: "Célmenhely nem található" }, { status: 404 });

  // Only one PENDING transfer per animal at a time
  const pending = await prisma.animalTransfer.findFirst({
    where: { animalId: params.id, status: "PENDING" },
  });
  if (pending) {
    return NextResponse.json({ error: "Már van folyamatban lévő áthelyezési kérelem ehhez az állathoz" }, { status: 409 });
  }

  const transfer = await prisma.animalTransfer.create({
    data: {
      animalId:      params.id,
      fromShelterId: animal.shelterId,
      toShelterId,
      requestedById: session.user.id,
      note:          note ?? null,
    },
    include: {
      fromShelter: { select: { name: true } },
      toShelter:   { select: { name: true } },
    },
  });

  // Notify target-shelter admins
  const [targetAdmins, requester] = await Promise.all([
    prisma.shelterAdmin.findMany({ where: { shelterId: toShelterId }, select: { userId: true, user: { select: { email: true, name: true } } } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
  ]);

  createNotifications(targetAdmins.map(a => ({
    userId: a.userId,
    type:   "TRANSFER_REQUESTED" as const,
    title:  "Áthelyezési kérelem érkezett",
    body:   `${animal.name} (${animal.shelter.name}) → ${toShelter.name}`,
    href:   "/dashboard/transfers",
  }))).catch(() => {});

  for (const admin of targetAdmins) {
    if (admin.user?.email) {
      sendTransferRequestEmail({
        to:              admin.user.email,
        adminName:       admin.user.name ?? "Admin",
        animalName:      animal.name,
        fromShelterName: animal.shelter.name,
        toShelterName:   toShelter.name,
        requesterName:   requester?.name ?? "Ismeretlen",
        note:            note ?? null,
        transferUrl:     `${BASE}/dashboard/transfers`,
      }).catch(() => {});
    }
  }

  return NextResponse.json(transfer, { status: 201 });
}

// GET /api/animals/[id]/transfer – áthelyezési előzmények lekérése
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const animal = await prisma.animal.findUnique({ where: { id: params.id }, select: { shelterId: true } });
  if (!animal) return NextResponse.json({ error: "Állat nem található" }, { status: 404 });

  if (session.user.role !== "SUPER_ADMIN") {
    const isAdmin = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: animal.shelterId },
    });
    if (!isAdmin) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const transfers = await prisma.animalTransfer.findMany({
    where:   { animalId: params.id },
    orderBy: { requestedAt: "desc" },
    include: {
      fromShelter:  { select: { name: true } },
      toShelter:    { select: { name: true } },
      requestedBy:  { select: { name: true } },
      resolvedBy:   { select: { name: true } },
    },
  });

  return NextResponse.json(transfers);
}
