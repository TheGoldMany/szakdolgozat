import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// POST /api/sponsorships/[id]/cancel – virtuális örökbefogadás lemondása
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
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
    if (sponsorship.status === "CANCELLED") {
      return NextResponse.json({ error: "Már le van mondva" }, { status: 409 });
    }

    if (sponsorship.stripeSubId) {
      await getStripe().subscriptions.update(sponsorship.stripeSubId, {
        cancel_at_period_end: true,
      });
    }

    const updated = await prisma.sponsorship.update({
      where: { id: params.id },
      data:  { status: "CANCELLED", cancelledAt: new Date() },
    });

    return NextResponse.json({ ok: true, sponsorship: updated });
  } catch (err) {
    console.error("Cancel sponsorship error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
