import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendDonationReceivedEmail, sendSubscriptionConfirmationEmail, sendSponsorshipStartedEmail } from "@/lib/email";
import { createNotification, createNotifications } from "@/lib/notifications";

// Disable body parsing — we need the raw body for signature verification
export const dynamic = "force-dynamic";

// POST /api/webhooks/stripe – handle Stripe webhook events
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  // Subscription cancelled/deleted via Stripe Dashboard or API
  if (event.type === "customer.subscription.deleted") {
    const stripeSub = event.data.object as Stripe.Subscription;
    await prisma.subscription.updateMany({
      where: { stripeSubId: stripeSub.id },
      data:  { status: "CANCELLED", cancelledAt: new Date() },
    });
    await prisma.sponsorship.updateMany({
      where: { stripeSubId: stripeSub.id },
      data:  { status: "CANCELLED", cancelledAt: new Date() },
    });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const metadata = checkoutSession.metadata ?? {};

    // ----------------------------------------------------------------
    // Case 1: One-time donation
    // ----------------------------------------------------------------
    if (metadata.donationId) {
      const donationId = metadata.donationId;

      // Mark donation as paid
      const donation = await prisma.donation.update({
        where: { id: donationId },
        data:  { paidAt: new Date() },
      });

      // Increment campaign raisedAmount if linked
      if (donation.campaignId) {
        const campaign = await prisma.campaign.findUnique({
          where:   { id: donation.campaignId },
          include: {
            shelter: {
              include: {
                admins: { include: { user: { select: { email: true, name: true } } }, take: 1 },
              },
            },
            user: { select: { email: true, name: true } },
          },
        });

        if (campaign) {
          await prisma.campaign.update({
            where: { id: donation.campaignId },
            data:  { raisedAmount: { increment: donation.amount } },
          });

          const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://allatimenhelyek.hu";
          const recipientEmail = campaign.shelter?.admins[0]?.user.email ?? campaign.user?.email;
          const recipientName  = campaign.shelter?.admins[0]?.user.name ?? campaign.user?.name ?? "Admin";

          // Notify campaign owner (shelter admin or individual user)
          const donorName = donation.isAnonymous
            ? null
            : (await prisma.user.findUnique({ where: { id: donation.userId ?? "" }, select: { name: true } }))?.name ?? null;

          // In-app notification for shelter admins
          const shelterAdmins = campaign.shelter
            ? await prisma.shelterAdmin.findMany({
                where:  { shelterId: campaign.shelter.id },
                select: { userId: true },
              })
            : [];
          const ownerUserIds = shelterAdmins.length > 0
            ? shelterAdmins.map((a) => a.userId)
            : campaign.userId ? [campaign.userId] : [];
          const amountStr = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(donation.amount);
          if (ownerUserIds.length > 0) {
            createNotifications(ownerUserIds.map((uid) => ({
              userId: uid,
              type:   "DONATION_RECEIVED" as const,
              title:  "Új adomány érkezett",
              body:   `${donorName ?? "Névtelen"} – ${amountStr} (${campaign.title})`,
              href:   `/dashboard`,
            }))).catch((err) => console.error("Donation notification error:", err));
          }

          if (recipientEmail) {
            sendDonationReceivedEmail({
              to:            recipientEmail,
              recipientName,
              campaignTitle: campaign.title,
              amount:        donation.amount,
              donorName,
              campaignUrl:   `${BASE_URL}/donate/${campaign.id}`,
            }).catch((err) => console.error("Donation email error:", err));
          }
        }
      }
    }

    // ----------------------------------------------------------------
    // Case 2: Subscription checkout completed
    // ----------------------------------------------------------------
    if (metadata.tierId && metadata.userId) {
      const { tierId, userId } = metadata;
      const stripeSubId = checkoutSession.subscription
        ? String(checkoutSession.subscription)
        : undefined;

      // Create Subscription record (avoid duplicates via stripeSubId unique constraint)
      await prisma.subscription.upsert({
        where:  { stripeSubId: stripeSubId ?? "" },
        update: {}, // already exists — no-op
        create: {
          userId,
          tierId,
          status:     "ACTIVE",
          stripeSubId: stripeSubId ?? null,
        },
      });

      // Send confirmation email to subscriber
      const [user, tier] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
        prisma.donationTier.findUnique({
          where:   { id: tierId },
          include: { shelter: { select: { name: true, slug: true } } },
        }),
      ]);

      if (user && tier?.shelter) {
        const amountStr = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(tier.amount);
        // In-app notification for subscriber
        createNotification({
          userId: userId,
          type:   "SUBSCRIPTION_STARTED",
          title:  "Előfizetés aktiválva",
          body:   `${tier.name} – ${amountStr}/hó (${tier.shelter.name})`,
          href:   `/shelters/${tier.shelter.slug}`,
        }).catch((err) => console.error("Subscription notification error:", err));

        // Notify shelter admins about new subscriber
        const subAdmins = await prisma.shelterAdmin.findMany({
          where:  { shelterId: tier.shelterId },
          select: { userId: true },
        });
        createNotifications(subAdmins.map((a) => ({
          userId: a.userId,
          type:   "DONATION_RECEIVED" as const,
          title:  "Új előfizető",
          body:   `${user.name ?? "Ismeretlen"} – ${tier.name} (${amountStr}/hó)`,
          href:   "/dashboard/subscribers",
        }))).catch((err) => console.error("Subscription admin notification error:", err));

        if (user.email) {
          sendSubscriptionConfirmationEmail({
            to:          user.email,
            name:        user.name ?? "Felhasználó",
            shelterName: tier.shelter.name,
            tierName:    tier.name,
            amount:      tier.amount,
            shelterSlug: tier.shelter.slug,
          }).catch((err) => console.error("Subscription email error:", err));
        }
      }
    }

    // ----------------------------------------------------------------
    // Case 3: Virtual adoption (sponsorship) checkout completed
    // ----------------------------------------------------------------
    if (metadata.sponsorAnimalId && metadata.userId) {
      const { sponsorAnimalId, userId } = metadata;
      const amount      = parseInt(metadata.sponsorAmount ?? "0", 10) || 0;
      const isPublic    = metadata.sponsorPublic !== "0";
      const displayName = metadata.sponsorName || null;
      const stripeSubId = checkoutSession.subscription
        ? String(checkoutSession.subscription)
        : undefined;

      await prisma.sponsorship.upsert({
        where:  { stripeSubId: stripeSubId ?? "" },
        update: {},
        create: {
          animalId: sponsorAnimalId,
          userId,
          amount,
          isPublic,
          displayName,
          status:   "ACTIVE",
          stripeSubId: stripeSubId ?? null,
        },
      });

      const animal = await prisma.animal.findUnique({
        where:  { id: sponsorAnimalId },
        select: { name: true, slug: true, shelterId: true },
      });
      if (animal) {
        const amountStr = new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(amount);
        createNotification({
          userId,
          type:  "SPONSORSHIP_STARTED",
          title: "Virtuális örökbefogadás aktiválva",
          body:  `${animal.name} – ${amountStr}/hó. Köszönjük a támogatást!`,
          href:  `/animals/${animal.slug}`,
        }).catch((err) => console.error("Sponsorship notification error:", err));

        const sponsorAdmins = await prisma.shelterAdmin.findMany({
          where:  { shelterId: animal.shelterId },
          select: { userId: true },
        });
        createNotifications(sponsorAdmins.map((a) => ({
          userId: a.userId,
          type:   "DONATION_RECEIVED" as const,
          title:  "Új virtuális gazdi",
          body:   `${animal.name} – ${amountStr}/hó`,
          href:   "/dashboard/animals",
        }))).catch((err) => console.error("Sponsorship admin notification error:", err));

        // Send confirmation email to the sponsor
        const sponsor = await prisma.user.findUnique({
          where:  { id: userId },
          select: { email: true, name: true },
        });
        if (sponsor?.email) {
          sendSponsorshipStartedEmail({
            to:         sponsor.email,
            name:       sponsor.name ?? "Felhasználó",
            animalName: animal.name,
            animalSlug: animal.slug,
            amount,
          }).catch((err) => console.error("Sponsorship email error:", err));
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
