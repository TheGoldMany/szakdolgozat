import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, subscriptionPeriodEnd } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import {
  sendSubscriptionCancelledEmail,
  sendSubscriptionCancelledAdminEmail,
} from "@/lib/email";
import { paymentsDisabled } from "@/lib/payments-guard";

// POST /api/subscriptions/[id]/cancel
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Fizetés kikapcsolva: a végpont nem létezik (lásd `lib/payments-enabled.ts`).
  const paymentsOff = paymentsDisabled();
  if (paymentsOff) return paymentsOff;

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

    if (subscription.status === "CANCELLED" || subscription.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Az előfizetés már le van mondva" }, { status: 409 });
    }

    // Cancel in Stripe at period end (user keeps access until the paid period ends)
    let periodEnd: Date | null = null;
    if (subscription.stripeSubId) {
      const stripeSub = await getStripe().subscriptions.update(subscription.stripeSubId, {
        cancel_at_period_end: true,
      });
      periodEnd = subscriptionPeriodEnd(stripeSub);
    }

    // A STÁTUSZ ACTIVE MARAD, és ez szándékos.
    //
    // A Stripe-ban a lemondás `cancel_at_period_end`, tehát a már kifizetett
    // hónap végéig él az előfizetés. Korábban a sor itt azonnal CANCELLED-re
    // állt, aminek három következménye volt: a támogató juttatása azonnal
    // eltűnt, pedig fizetett érte; a `TC-18-22` saját elfogadási feltétele
    // („az időszak végéig még aktív marad") sérült; és mivel a feliratkozás
    // duplikátum-ellenőrzése csak ACTIVE sort tilt, a támogató azonnal újra
    // elő tudott fizetni ugyanarra a csomagra — az ÁTFEDŐ IDŐSZAKRA KÉTSZER
    // FIZETETT.
    //
    // A végleges CANCELLED a `customer.subscription.deleted` eseményből jön,
    // amikor az időszak valóban lejárt.
    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data:  { cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd },
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
