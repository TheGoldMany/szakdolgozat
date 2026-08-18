import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  // Az összeg nem szerkeszthető: a csomagösszegek platformszinten fixek, és a
  // Stripe-előfizetés a belépéskori árhoz van kötve. A név és a leírás viszont
  // a menhelyé – a csomag értékét a történet adja, nem a szám.
  isActive:    z.boolean().optional(),
});

async function checkShelterAdmin(shelterId: string, userId: string, role: string) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "SHELTER_ADMIN") {
    const record = await prisma.shelterAdmin.findFirst({ where: { shelterId, userId } });
    return !!record;
  }
  return false;
}

// PATCH /api/shelters/[id]/tiers/[tierId] – update tier
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; tierId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  if (!(await checkShelterAdmin(params.id, session.user.id, session.user.role ?? ""))) {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const tier = await prisma.donationTier.findFirst({
    where: { id: params.tierId, shelterId: params.id },
  });
  if (!tier) {
    return NextResponse.json({ error: "A csomag nem található" }, { status: 404 });
  }

  const updated = await prisma.donationTier.update({
    where: { id: params.tierId },
    data:  parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/shelters/[id]/tiers/[tierId] – delete tier
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; tierId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  if (!(await checkShelterAdmin(params.id, session.user.id, session.user.role ?? ""))) {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const tier = await prisma.donationTier.findFirst({
    where: { id: params.tierId, shelterId: params.id },
  });
  if (!tier) {
    return NextResponse.json({ error: "A csomag nem található" }, { status: 404 });
  }

  await prisma.donationTier.delete({ where: { id: params.tierId } });
  logAudit({
    actorId:    session.user.id,
    action:     "TIER_DELETED",
    targetType: "DonationTier",
    targetId:   tier.id,
    targetName: tier.name,
  });
  return NextResponse.json({ success: true });
}
