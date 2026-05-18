import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// POST /api/subscriptions/[id]/admin-cancel
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { tier: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Előfizetés nem található" }, { status: 404 });
    }

    // SHELTER_ADMIN: can only cancel subscriptions belonging to their shelter
    if (role === "SHELTER_ADMIN") {
      const adminRecord = await prisma.shelterAdmin.findFirst({
        where: { userId: session.user.id },
      });
      if (!adminRecord || subscription.tier.shelterId !== adminRecord.shelterId) {
        return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
      }
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json({ error: "Az előfizetés már le van mondva" }, { status: 409 });
    }

    // Immediate cancel in Stripe (admin action)
    if (subscription.stripeSubId) {
      await getStripe().subscriptions.cancel(subscription.stripeSubId);
    }

    // Update DB
    await prisma.subscription.update({
      where: { id: params.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin cancel subscription error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
