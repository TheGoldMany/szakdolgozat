import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import {
  sendSubscriptionCancelledEmail,
  sendSubscriptionCancelledAdminEmail,
} from "@/lib/email";

// POST /api/subscriptions/[id]/cancel
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where:   { id: params.id },
      include: {
        tier: {
          select: {
            name: true,
            shelter: {
              select: {
                name: true,
                admins: { select: { user: { select: { email: true, name: true } } } },
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Előfizetés nem található" }, { status: 404 });
    }

    if (subscription.userId !== session.user.id) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    if (subscription.status === "CANCELLED") {
      return NextResponse.json({ error: "Az előfizetés már le van mondva" }, { status: 409 });
    }

    // Cancel in Stripe at period end (user keeps access until the paid period ends)
    if (subscription.stripeSubId) {
      await getStripe().subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });
    }

    // Update DB
    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data:  { status: "CANCELLED", cancelledAt: new Date() },
    });

    createNotification({
      userId: session.user.id,
      type:   "SUBSCRIPTION_CANCELLED",
      title:  "Előfizetés lemondva",
      body:   subscription.tier?.name ?? "Előfizetés",
      href:   "/profile",
    }).catch(() => {});

    const tierName    = subscription.tier?.name ?? "Előfizetés";
    const shelterName = subscription.tier?.shelter?.name ?? "";
    const userEmail   = session.user.email;
    const userName    = session.user.name ?? userEmail ?? "Felhasználó";

    if (userEmail) {
      sendSubscriptionCancelledEmail({ to: userEmail, name: userName, tierName, shelterName })
        .catch((err) => console.error("[sub cancel email - user]", err));
    }

    for (const admin of subscription.tier?.shelter?.admins ?? []) {
      sendSubscriptionCancelledAdminEmail({
        to:             admin.user.email,
        adminName:      admin.user.name ?? admin.user.email,
        subscriberName: userName,
        tierName,
        shelterName,
      }).catch((err) => console.error("[sub cancel email - admin]", err));
    }

    return NextResponse.json({ ok: true, subscription: updated });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
