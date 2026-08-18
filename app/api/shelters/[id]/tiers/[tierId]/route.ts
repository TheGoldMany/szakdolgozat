import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  amount:      z.number().int().min(175, "Az összeg minimum 175 Ft (Stripe limit)").optional(),
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

  // Az összeg nem módosítható, amíg élő előfizető van a csomagon.
  //
  // A Stripe-előfizetés a létrehozásakori árhoz van kötve (beégetett
  // `price_data`), ezért az itteni átírás a meglévő előfizetőket NEM érinti:
  // ők a régi összeget fizetnék tovább, miközben a felület már az újat
  // mutatná. A visszamenőleges átárazás ráadásul a hátuk mögött emelne díjat.
  // Változó összeghez új csomag kell; a régi marad a meglévőknek.
  const amountChanges =
    parsed.data.amount !== undefined && parsed.data.amount !== tier.amount;

  if (amountChanges) {
    const liveSubscribers = await prisma.subscription.count({
      where: { tierId: params.tierId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    });
    if (liveSubscribers > 0) {
      return NextResponse.json(
        {
          error:
            `A csomag összege nem módosítható, mert ${liveSubscribers} élő előfizetés tartozik hozzá. ` +
            "Ők a Stripe-nál a belépéskori összeget fizetik, így a módosítás nem érné el őket. " +
            "Hozz létre új csomagot az új összeggel, ezt pedig állítsd inaktívra.",
          liveSubscribers,
        },
        { status: 409 }
      );
    }
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
