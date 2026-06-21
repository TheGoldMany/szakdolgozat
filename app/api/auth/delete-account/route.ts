import { NextResponse }      from "next/server";
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import { prisma }            from "@/lib/prisma";
import { getStripe }         from "@/lib/stripe";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nem vagy bejelentkezve." }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id:    true,
        email: true,
        subscriptions: { where: { status: "ACTIVE" }, select: { id: true, stripeSubId: true } },
        sponsorships:  { where: { status: "ACTIVE" }, select: { id: true, stripeSubId: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Felhasználó nem található." }, { status: 404 });
    }

    const stripe = getStripe();

    // Cancel all active Stripe subscriptions (donation tiers)
    for (const sub of user.subscriptions) {
      if (!sub.stripeSubId) continue;
      try {
        await stripe.subscriptions.cancel(sub.stripeSubId);
      } catch (err) {
        console.error(`Failed to cancel subscription ${sub.stripeSubId}:`, err);
      }
    }

    // Cancel all active Stripe sponsorships (virtual adoptions)
    for (const spo of user.sponsorships) {
      if (!spo.stripeSubId) continue;
      try {
        await stripe.subscriptions.cancel(spo.stripeSubId);
      } catch (err) {
        console.error(`Failed to cancel sponsorship ${spo.stripeSubId}:`, err);
      }
    }

    // Atomically anonymize PII + schedule deletion + revoke sessions
    await prisma.$transaction([
      // Wipe personal data immediately; financial records keep userId for audit trail
      prisma.user.update({
        where: { id: userId },
        data: {
          name:               "Törölt felhasználó",
          // Frees the email slot so another person can register with same address
          email:              `deleted-${userId}@deleted.invalid`,
          image:              null,
          phone:              null,
          address:            null,
          city:               null,
          password:           null,
          stripeAccountId:    null,
          deletionScheduledAt: new Date(),
          updatedAt:          new Date(),
        },
      }),
      // Revoke all sessions so the user is signed out everywhere
      prisma.session.deleteMany({ where: { userId } }),
      // Remove OAuth links
      prisma.account.deleteMany({ where: { userId } }),
      // Remove password reset tokens
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      // Mark subscriptions and sponsorships cancelled in our DB
      prisma.subscription.updateMany({
        where: { userId, status: "ACTIVE" },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      }),
      prisma.sponsorship.updateMany({
        where: { userId, status: "ACTIVE" },
        data:  { status: "CANCELLED", cancelledAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Szerverhiba. Próbáld újra." }, { status: 500 });
  }
}
