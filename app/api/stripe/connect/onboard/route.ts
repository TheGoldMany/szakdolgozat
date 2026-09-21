import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStaleAccountError } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("shelter"), shelterId: z.string().min(1) }),
  z.object({ type: z.literal("user") }),
]);

// POST /api/stripe/connect/onboard
export async function POST(req: NextRequest) {
  try {
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
          type:    "express",
          country: "HU",
        });
        accountId = account.id;
        await prisma.shelter.update({
          where: { id: shelterId },
          data:  { stripeAccountId: accountId, stripeOnboardingComplete: false },
        });
      }

      const returnUrl  = `${BASE}/api/stripe/connect/callback?type=shelter&shelterId=${shelterId}`;
      const refreshUrl = `${BASE}/dashboard/settings`;

      // Try to create account link; if the stored ID is stale (e.g. from test mode),
      // reset it, create a fresh account, and retry once.
      let accountLink;
      try {
        accountLink = await getStripe().accountLinks.create({
          account:     accountId,
          refresh_url: refreshUrl,
          return_url:  returnUrl,
          type:        "account_onboarding",
        });
      } catch (linkErr) {
        if (!isStaleAccountError(linkErr)) throw linkErr;

        // Stale/test account ID – create a new live account
        const newAccount = await getStripe().accounts.create({
          type:    "express",
          country: "HU",
        });
        accountId = newAccount.id;
        await prisma.shelter.update({
          where: { id: shelterId },
          data:  { stripeAccountId: accountId, stripeOnboardingComplete: false },
        });
        accountLink = await getStripe().accountLinks.create({
          account:     accountId,
          refresh_url: refreshUrl,
          return_url:  returnUrl,
          type:        "account_onboarding",
        });
      }

      return NextResponse.json({ url: accountLink.url });
    }

    // type === "user"
    const userId = session.user.id;
    const user   = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "Felhasználó nem található" }, { status: 404 });
    }

    let accountId = user.stripeAccountId;

    if (!accountId) {
      const account = await getStripe().accounts.create({
        type:    "express",
        country: "HU",
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data:  { stripeAccountId: accountId, stripeOnboardingComplete: false },
      });
    }

    const returnUrl  = `${BASE}/api/stripe/connect/callback?type=user`;
    const refreshUrl = `${BASE}/profile`;

    // Same stale-account retry for user type
    let accountLink;
    try {
      accountLink = await getStripe().accountLinks.create({
        account:     accountId,
        refresh_url: refreshUrl,
        return_url:  returnUrl,
        type:        "account_onboarding",
      });
    } catch (linkErr) {
      if (!isStaleAccountError(linkErr)) throw linkErr;

      const newAccount = await getStripe().accounts.create({
        type:    "express",
        country: "HU",
      });
      accountId = newAccount.id;
      await prisma.user.update({
        where: { id: userId },
        data:  { stripeAccountId: accountId, stripeOnboardingComplete: false },
      });
      accountLink = await getStripe().accountLinks.create({
        account:     accountId,
        refresh_url: refreshUrl,
        return_url:  returnUrl,
        type:        "account_onboarding",
      });
    }

    return NextResponse.json({ url: accountLink.url });

  } catch (err) {
    console.error("Stripe Connect onboard error:", err);
    // A Stripe nyers szövegét NEM adjuk ki: angol, és a hozzáférési hibák
    // esetében benne van a platform titkos kulcsának a vége meg a belső
    // `acct_` azonosító. Ez a menhely adminjának se nem érthető, se nem az ő
    // adata — naplóba való, nem a felületre.
    return NextResponse.json(
      { error: "A Stripe kapcsolódás most nem sikerült. Próbáld újra később." },
      { status: 500 },
    );
  }
}
