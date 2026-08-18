import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/subscriptions/[id] – előfizetés rekord végleges törlése (SUPER_ADMIN).
 *
 * Csak takarításra való (téves vagy teszt rekord). Aktív előfizetést előbb le
 * kell mondani, mert a törlés a Stripe-nál futó fizetést nem állítja le — a
 * rekord eltűnne, a terhelés viszont folytatódna.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const sub = await prisma.subscription.findUnique({
    where:  { id: params.id },
    select: {
      id: true, status: true,
      user: { select: { name: true, email: true } },
      tier: { select: { name: true } },
    },
  });
  if (!sub) {
    return NextResponse.json({ error: "Az előfizetés nem található" }, { status: 404 });
  }

  if (sub.status === "ACTIVE") {
    return NextResponse.json(
      { error: "Aktív előfizetés nem törölhető. Előbb mondd le, hogy a Stripe-nál is leálljon a terhelés." },
      { status: 409 },
    );
  }

  try {
    await prisma.subscription.delete({ where: { id: params.id } });
    logAudit({
      actorId:    session.user.id,
      action:     "SUBSCRIPTION_DELETED",
      targetType: "Subscription",
      targetId:   sub.id,
      targetName: `${sub.user?.name ?? sub.user?.email ?? "ismeretlen"} – ${sub.tier?.name ?? "csomag"}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/subscriptions/[id] DELETE]", error);
    return NextResponse.json({ error: "A törlés nem sikerült" }, { status: 500 });
  }
}
