import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, resolveTransferDestination, platformFee, stripeProcessingFee, PLATFORM_FEE_PERCENT, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE_HUF, subscriptionFeePercent } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { blockIfSuspended } from "@/lib/account-status";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const schema = z.object({
  animalId:    z.string().min(1),
  amount:      z.number().int().min(500).max(1_000_000),  // havi HUF
  isPublic:    z.boolean().optional(),
  displayName: z.string().max(60).optional(),
});

// POST /api/checkout/sponsor – virtuális örökbefogadás (havi rendszeres) Stripe checkout
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`sponsor:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Túl sok kísérlet. Próbáld újra 1 perc múlva." }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  const suspended = await blockIfSuspended(session.user.id);
  if (suspended) return suspended;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }
  const { animalId, amount, isPublic, displayName } = parsed.data;

  const animal = await prisma.animal.findUnique({
    where:   { id: animalId },
    include: { shelter: { select: { id: true, name: true, slug: true, stripeAccountId: true, stripeOnboardingComplete: true } } },
  });
  if (!animal) return NextResponse.json({ error: "Az állat nem található" }, { status: 404 });

  // Prevent duplicate active sponsorships for the same animal
  const existingSponsor = await prisma.sponsorship.findFirst({
    where: { userId: session.user.id, animalId, status: "ACTIVE" },
  });
  if (existingSponsor) {
    return NextResponse.json({ error: "Már van aktív virtuális örökbefogadásod ennél az állatnál." }, { status: 409 });
  }

  const connectedAccountId = await resolveTransferDestination(
    animal.shelter.stripeOnboardingComplete ? animal.shelter.stripeAccountId : null
  );

  const feeForint   = connectedAccountId ? platformFee(amount) : 0;
  const stripeFeeFt = connectedAccountId ? stripeProcessingFee(amount) : 0;
  // Cover both platform fee + Stripe processing fee so shelter nets exactly `amount`.
  const feePercent  = connectedAccountId ? subscriptionFeePercent(amount) : 0;

  let checkoutSession;
  try {
    checkoutSession = await getStripe().checkout.sessions.create({
      mode:                 "subscription",
      payment_method_types: ["card"],
      // Pass sponsor's email so Stripe auto-sends monthly invoice emails
      customer_email: session.user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency:     "huf",
            product_data: { name: `Virtuális örökbefogadás – ${animal.name} (${animal.shelter.name})` },
            unit_amount:  amount * 100,
            recurring:    { interval: "month" },
          },
          quantity: 1,
        },
        ...(feeForint > 0
          ? [{
              price_data: {
                currency:     "huf",
                product_data: { name: `Platform díj (${PLATFORM_FEE_PERCENT}%)` },
                unit_amount:  feeForint * 100,
                recurring:    { interval: "month" as const },
              },
              quantity: 1,
            }]
          : []),
        ...(stripeFeeFt > 0
          ? [{
              price_data: {
                currency:     "huf",
                product_data: { name: `Feldolgozási díj (${STRIPE_PERCENT_FEE}% + ${STRIPE_FIXED_FEE_HUF} Ft)` },
                unit_amount:  stripeFeeFt * 100,
                recurring:    { interval: "month" as const },
              },
              quantity: 1,
            }]
          : []),
      ],
      success_url: `${BASE}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE}/animals/${animal.slug}`,
      metadata: {
        sponsorAnimalId: animalId,
        userId:          session.user.id,
        sponsorAmount:   String(amount),
        sponsorPublic:   isPublic === false ? "0" : "1",
        sponsorName:     displayName ?? "",
      },
      ...(connectedAccountId && {
        subscription_data: {
          description: `Virtuális örökbefogadás – ${animal.name}`,
          application_fee_percent: feePercent,
          transfer_data: { destination: connectedAccountId },
        },
      }),
    });
  } catch (err) {
    console.error("Stripe checkout/sponsor error:", err);
    const msg = err instanceof Error ? err.message : "Stripe hiba";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
