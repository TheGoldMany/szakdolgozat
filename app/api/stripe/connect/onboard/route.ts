import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("shelter"), shelterId: z.string().min(1) }),
  z.object({ type: z.literal("user") }),
]);

// POST /api/stripe/connect/onboard
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;

  if (body.type === "shelter") {
    const { shelterId } = body;

    // Verify user is shelter admin or SUPER_ADMIN
    const isSuperAdmin = (session.user as { role?: string }).role === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      const adminRecord = await prisma.shelterAdmin.findUnique({
        where: { userId_shelterId: { userId: session.user.id, shelterId } },
      });
      if (!adminRecord) {
        return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
      }
    }

    const shelter = await prisma.shelter.findUnique({ where: { id: shelterId } });
    if (!shelter) {
      return NextResponse.json({ error: "Menhely nem található" }, { status: 404 });
    }

    let accountId = shelter.stripeAccountId;

    // Create Stripe Express account if not exists
    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: "express",
        country: "HU",
      });
      accountId = account.id;
      await prisma.shelter.update({
        where: { id: shelterId },
        data: { stripeAccountId: accountId },
      });
    }

    const returnUrl = `${BASE}/api/stripe/connect/callback?type=shelter&shelterId=${shelterId}`;
    const refreshUrl = `${BASE}/api/stripe/connect/onboard`;

    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  }

  // type === "user"
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Felhasználó nem található" }, { status: 404 });
  }

  let accountId = user.stripeAccountId;

  // Create Stripe Express account if not exists
  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: "express",
      country: "HU",
    });
    accountId = account.id;
    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: accountId },
    });
  }

  const returnUrl = `${BASE}/api/stripe/connect/callback?type=user`;
  const refreshUrl = `${BASE}/api/stripe/connect/onboard`;

  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
