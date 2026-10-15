import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, subscriptionPeriodEnd } from "@/lib/stripe";
import { sendSponsorshipCancelledEmail } from "@/lib/email";
import { paymentsDisabled } from "@/lib/payments-guard";

// POST /api/sponsorships/[id]/cancel – virtuális örökbefogadás lemondása
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  // Fizetés kikapcsolva: a végpont nem létezik (lásd `lib/payments-enabled.ts`).
  const paymentsOff = paymentsDisabled();
  if (paymentsOff) return paymentsOff;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
    }

    const sponsorship = await prisma.sponsorship.findUnique({ where: { id: params.id } });
    if (!sponsorship) {
      return NextResponse.json({ error: "Virtuális örökbefogadás nem található" }, { status: 404 });
    }
    if (sponsorship.userId !== session.user.id) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }
    if (sponsorship.status === "CANCELLED" || sponsorship.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Már le van mondva" }, { status: 409 });
    }

    let periodEnd: Date | null = null;
    if (sponsorship.stripeSubId) {
      const stripeSub = await getStripe().subscriptions.update(sponsorship.stripeSubId, {
        cancel_at_period_end: true,
      });
      periodEnd = subscriptionPeriodEnd(stripeSub);
    }

    // A STÁTUSZ ACTIVE MARAD – ugyanaz az ok, mint az előfizetés lemondásánál:
    // a Stripe-ban a hónap végéig él, tehát a virtuális gazdi addig jár, és
    // addig új örökbefogadást sem indíthat ugyanarra az állatra (különben az
    // átfedő időszakra kétszer fizetne). A végleges CANCELLED a
    // `customer.subscription.deleted` eseményből jön.
    const updated = await prisma.sponsorship.update({
      where: { id: params.id },
      data:  { cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd },
      include: {
        animal: { select: { name: true } },
        user:   { select: { email: true, name: true } },
      },
    });

    if (updated.user?.email) {
      sendSponsorshipCancelledEmail({
        to:         updated.user.email,
        name:       updated.user.name ?? "Felhasználó",
        animalName: updated.animal?.name ?? "az állat",
        amount:     updated.amount,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, sponsorship: updated });
  } catch (err) {
    console.error("Cancel sponsorship error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
