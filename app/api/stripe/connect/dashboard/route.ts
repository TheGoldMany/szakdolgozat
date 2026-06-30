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

    const { shelterId } = await req.json().catch(() => ({}));

    let accountId: string | null;

    if (shelterId) {
      // Menhely Stripe vezérlőpult – admin vagy super admin
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
      accountId = shelter?.stripeAccountId ?? null;
    } else {
      // Saját (felhasználói) Stripe vezérlőpult
      const user = await prisma.user.findUnique({
        where:  { id: session.user.id },
        select: { stripeAccountId: true },
      });
      accountId = user?.stripeAccountId ?? null;
    }

    if (!accountId) {
      return NextResponse.json({ error: "Stripe fiók nem található" }, { status: 404 });
    }

    const loginLink = await getStripe().accounts.createLoginLink(accountId);
    return NextResponse.json({ url: loginLink.url });
  } catch (err) {
    console.error("Stripe dashboard link error:", err);
    const message = err instanceof Error ? err.message : "Ismeretlen hiba";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
