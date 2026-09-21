import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStaleAccountError } from "@/lib/stripe";

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

    try {
      const loginLink = await getStripe().accounts.createLoginLink(accountId);
      return NextResponse.json({ url: loginLink.url });
    } catch (linkErr) {
      // Az elérhetetlen fiók NEM szerverhiba, hanem egy állapot, amit a
      // felhasználónak meg kell tudnia oldani. A Stripe nyers szövege erre
      // alkalmatlan: angol, és benne van a PLATFORM titkos kulcsának a vége
      // meg a belső `acct_` azonosító — ezt a menhely adminjának nem kell
      // látnia.
      if (isStaleAccountError(linkErr)) {
        console.error("[stripe] elérhetetlen csatolt fiók:", accountId, linkErr);
        return NextResponse.json(
          {
            code:  "account_inaccessible",
            error: "Ez a Stripe fiók már nem érhető el a platformról. "
                 + "Ez akkor fordul elő, ha a fiók még tesztüzemben készült, "
                 + "vagy ha a hozzáférést visszavonták a Stripe-nál. "
                 + "Kapcsolódj újra, és a rendszer új fiókot hoz létre.",
          },
          { status: 409 },
        );
      }
      throw linkErr;
    }
  } catch (err) {
    console.error("Stripe dashboard link error:", err);
    // Általános hiba: a Stripe belső szövegét nem adjuk ki, csak naplózzuk.
    return NextResponse.json(
      { error: "A Stripe vezérlőpult most nem érhető el. Próbáld újra később." },
      { status: 500 },
    );
  }
}
