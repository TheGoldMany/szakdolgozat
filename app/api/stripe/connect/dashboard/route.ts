import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// POST /api/stripe/connect/dashboard
// Returns a Stripe Express dashboard login link for the shelter's connected account.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
    }

    const { shelterId } = await req.json();
    if (!shelterId) {
      return NextResponse.json({ error: "shelterId hiányzik" }, { status: 400 });
    }

    const isSuperAdmin = (session.user as { role?: string }).role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      const adminRecord = await prisma.shelterAdmin.findUnique({
        where: { userId_shelterId: { userId: session.user.id, shelterId } },
      });
      if (!adminRecord) {
        return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
      }
    }

    const shelter = await prisma.shelter.findUnique({
      where:  { id: shelterId },
      select: { stripeAccountId: true },
    });

    if (!shelter?.stripeAccountId) {
      return NextResponse.json({ error: "Stripe fiók nem található" }, { status: 404 });
    }

    const loginLink = await getStripe().accounts.createLoginLink(shelter.stripeAccountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (err) {
    console.error("Stripe dashboard link error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
