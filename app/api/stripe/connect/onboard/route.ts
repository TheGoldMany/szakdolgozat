import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getStripe, isStaleAccountError, isPlatformSetupError, stripeErrorInfo,
} from "@/lib/stripe";

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

    // A Stripe nyers SZÖVEGÉT nem adjuk ki (benne lehet a platform kulcsának a
    // vége és a belső `acct_` azonosító), a gépi hibakódot viszont igen: abból
    // derül ki, mi a baj. Egy általános „nem sikerült" ugyanolyan
    // használhatatlan, mint a nyers hiba — ezt élesben megtanultuk.
    const info = stripeErrorInfo(err);

    // A leggyakoribb ok éles kulcsra váltás után: a PLATFORM Connect-profilja
    // nincs kitöltve. Ezzel a menhely adminja nem tud mit kezdeni, ezért
    // kimondjuk, hogy ez az üzemeltető dolga.
    if (isPlatformSetupError(err)) {
      return NextResponse.json(
        {
          code:  "platform_setup_incomplete",
          error: "A Stripe még nem engedi új fiók létrehozását ezen a platformon. "
               + "Ez a platform beállítása, nem a menhelyé: az üzemeltetőnek a Stripe "
               + "vezérlőpultján be kell fejeznie a Connect platform-profilt. "
               + "Szólj az üzemeltetőnek.",
          stripe: info,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "A Stripe kapcsolódás most nem sikerült. Ha újrapróbálva is ezt kapod, "
             + "add meg az üzemeltetőnek az alábbi hibakódot.",
        stripe: info,
      },
      { status: 500 },
    );
  }
}
