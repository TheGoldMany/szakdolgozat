import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// GET /api/stripe/connect/callback?type=shelter&shelterId=... | ?type=user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(`${BASE}/auth/login`);
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const shelterId = searchParams.get("shelterId");

  if (type === "shelter" && shelterId) {
    // Verify user is shelter admin or SUPER_ADMIN
    const isSuperAdmin = (session.user as { role?: string }).role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      const adminRecord = await prisma.shelterAdmin.findUnique({
        where: { userId_shelterId: { userId: session.user.id, shelterId } },
      });
      if (!adminRecord) {
        return NextResponse.redirect(`${BASE}/dashboard/settings`);
      }
    }

    const shelter = await prisma.shelter.findUnique({ where: { id: shelterId } });
    if (!shelter?.stripeAccountId) {
      return NextResponse.redirect(`${BASE}/dashboard/settings`);
    }

    const account = await getStripe().accounts.retrieve(shelter.stripeAccountId);

    if (account.details_submitted) {
      await prisma.shelter.update({
        where: { id: shelterId },
        data: { stripeOnboardingComplete: true },
      });
    }

    return NextResponse.redirect(`${BASE}/dashboard/settings?stripe=success`);
  }

  if (type === "user") {
    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeAccountId) {
      return NextResponse.redirect(`${BASE}/profile`);
    }

    const account = await getStripe().accounts.retrieve(user.stripeAccountId);

    if (account.details_submitted) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeOnboardingComplete: true },
      });
    }

    return NextResponse.redirect(`${BASE}/profile?stripe=success`);
  }

  // Fallback
  return NextResponse.redirect(`${BASE}/dashboard/settings`);
}
